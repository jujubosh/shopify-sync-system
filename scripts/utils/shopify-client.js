const fetch = require('node-fetch');
const https = require('https');

class ShopifyClient {
  constructor(domain, apiToken) {
    this.domain = domain;
    this.apiToken = apiToken;
    this.baseUrl = `https://${domain}/admin/api/2025-07`;
  }

  async graphql(query, variables = {}, retries = 3) {
    const url = `${this.baseUrl}/graphql.json`;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.apiToken,
          },
          body: JSON.stringify({ query, variables }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        if (data.errors) {
          throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
        }
        return data.data;
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  async rest(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        method,
        hostname: this.domain,
        path: `/admin/api/2025-07${path}`,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.apiToken,
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
}

module.exports = { ShopifyClient }; 