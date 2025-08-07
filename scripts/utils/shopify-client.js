const fetch = require('node-fetch');
const https = require('https');

class ShopifyAPIError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.name = 'ShopifyAPIError';
    this.status = status;
    this.details = details;
  }
}

class GraphQLError extends Error {
  constructor(errors) {
    const errorMessages = errors.map(err => err.message).join('; ');
    super(`GraphQL errors occurred: ${errorMessages}`);
    this.name = 'GraphQLError';
    this.errors = errors;
  }
}

class ShopifyClient {
  constructor(domain, apiToken, config = {}) {
    // Input validation
    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain must be a non-empty string');
    }
    if (!apiToken || typeof apiToken !== 'string') {
      throw new Error('API token must be a non-empty string');
    }

    this.domain = domain;
    this.apiToken = this.resolveApiToken(apiToken);
    this.apiVersion = config.apiVersion || '2024-10';
    this.baseUrl = `https://${domain}/admin/api/${this.apiVersion}`;
    
    // Rate limiting configuration
    this.rateLimiter = {
      requestsPerSecond: config.requestsPerSecond || 2,
      maxConcurrentRequests: config.maxConcurrentRequests || 10,
      requestQueue: [],
      lastRequestTime: 0,
      concurrentRequests: 0
    };

    // Request configuration
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.baseDelay = config.baseDelay || 1000;

    // Metrics tracking
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      rateLimitHits: 0,
      graphqlErrors: 0,
      restErrors: 0
    };
  }

  resolveApiToken(token) {
    if (token.startsWith('SHOPIFY_') && token.endsWith('_TOKEN')) {
      const envToken = process.env[token];
      if (!envToken) {
        throw new Error(`Environment variable ${token} not found`);
      }
      return envToken;
    }
    return token;
  }

  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
    const minInterval = 1000 / this.rateLimiter.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    // Wait if we have too many concurrent requests
    while (this.rateLimiter.concurrentRequests >= this.rateLimiter.maxConcurrentRequests) {
      await this.sleep(100);
    }

    this.rateLimiter.lastRequestTime = Date.now();
    this.rateLimiter.concurrentRequests++;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shouldRetry(error, attempt, maxRetries) {
    return attempt < maxRetries && (
      error.status === 429 || // Rate limit
      error.status >= 500 || // Server errors
      error.code === 'ECONNRESET' || // Network errors
      error.code === 'ETIMEDOUT' ||
      error.message.includes('network')
    );
  }

  calculateBackoffDelay(attempt, baseDelay) {
    return baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
  }

  async makeRequest(method, url, body = null, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.apiToken,
          'User-Agent': 'Shopify-Sync-System/1.0.0',
          ...options.headers
        },
        body: body ? JSON.stringify(body) : null,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limit headers
      const remainingRequests = response.headers.get('X-Shopify-Shop-Api-Call-Limit');
      if (remainingRequests) {
        this.updateRateLimitInfo(remainingRequests);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    } finally {
      this.rateLimiter.concurrentRequests--;
    }
  }

  updateRateLimitInfo(limitHeader) {
    // Parse "1/40" format to track rate limit usage
    const [used, limit] = limitHeader.split('/').map(Number);
    const usagePercentage = (used / limit) * 100;
    
    if (usagePercentage > 80) {
      console.warn(`Rate limit warning: ${used}/${limit} requests used`);
    }
  }

  async graphql(query, variables = {}, options = {}) {
    const startTime = Date.now();
    this.metrics.requestCount++;

    try {
      await this.waitForRateLimit();
      
      const response = await this.makeRequest('POST', `${this.baseUrl}/graphql.json`, {
        query,
        variables
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ShopifyAPIError(response.status, `HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.errors) {
        this.metrics.graphqlErrors++;
        throw new GraphQLError(data.errors);
      }

      this.recordSuccess(Date.now() - startTime);
      return data.data;

    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }

  async rest(method, path, body = null, options = {}) {
    const startTime = Date.now();
    this.metrics.requestCount++;

    try {
      await this.waitForRateLimit();

      return new Promise((resolve, reject) => {
        const requestOptions = {
          method,
          hostname: this.domain,
          path: `/admin/api/${this.apiVersion}${path}`,
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.apiToken,
            'User-Agent': 'Shopify-Sync-System/1.0.0',
            ...options.headers
          },
          timeout: this.timeout
        };

        const req = https.request(requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsedData = JSON.parse(data);
                this.recordSuccess(Date.now() - startTime);
                resolve(parsedData);
              } catch (e) {
                this.recordSuccess(Date.now() - startTime);
                resolve(data);
              }
            } else {
              const error = new ShopifyAPIError(res.statusCode, `HTTP ${res.statusCode}: ${data}`);
              this.recordError(error);
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          this.recordError(error);
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          const error = new Error('Request timeout');
          this.recordError(error);
          reject(error);
        });

        if (body) {
          req.write(JSON.stringify(body));
        }
        req.end();
      });

    } catch (error) {
      this.recordError(error);
      throw error;
    }
  }

  recordSuccess(responseTime) {
    this.metrics.totalResponseTime += responseTime;
  }

  recordError(error) {
    this.metrics.errorCount++;
    if (error.status === 429) {
      this.metrics.rateLimitHits++;
    } else if (error instanceof GraphQLError) {
      this.metrics.graphqlErrors++;
    } else {
      this.metrics.restErrors++;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.metrics.requestCount > 0 
        ? this.metrics.totalResponseTime / this.metrics.requestCount 
        : 0,
      errorRate: this.metrics.requestCount > 0 
        ? this.metrics.errorCount / this.metrics.requestCount 
        : 0,
      rateLimitHitRate: this.metrics.requestCount > 0
        ? this.metrics.rateLimitHits / this.metrics.requestCount
        : 0
    };
  }

  resetMetrics() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
      rateLimitHits: 0,
      graphqlErrors: 0,
      restErrors: 0
    };
  }
}

module.exports = { ShopifyClient, ShopifyAPIError, GraphQLError }; 