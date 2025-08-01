const https = require('https');
const fs = require('fs');
const path = require('path');
const { EmailTemplates } = require('./email-templates');

class EmailNotifier {
  constructor(config) {
    // Use config Mailgun credentials if available, otherwise fall back to environment variables
    this.apiKey = config.mailgun?.apiKey && !config.mailgun.apiKey.startsWith('MAILGUN_') 
      ? config.mailgun.apiKey 
      : (process.env[config.mailgun?.apiKey] || process.env.MAILGUN_API_KEY);
    this.domain = config.mailgun?.domain && !config.mailgun.domain.startsWith('MAILGUN_')
      ? config.mailgun.domain
      : (process.env[config.mailgun?.domain] || process.env.MAILGUN_DOMAIN);
    this.baseUrl = 'https://api.mailgun.net';
    this.fromEmail = config.emailNotifications?.fromEmail && !config.emailNotifications.fromEmail.startsWith('EMAIL_')
      ? config.emailNotifications.fromEmail
      : (process.env[config.emailNotifications?.fromEmail] || process.env.EMAIL_FROM || 'admin@livegoodlogistics.com');
    this.toEmail = config.emailNotifications?.toEmail && !config.emailNotifications.toEmail.startsWith('EMAIL_')
      ? config.emailNotifications.toEmail
      : (process.env[config.emailNotifications?.toEmail] || process.env.EMAIL_TO || 'justin@livegoodlogistics.com');
    this.enabled = config.emailNotifications?.enabled !== false;
    
    // Enhanced email settings with better defaults
    this.sendErrors = config.emailNotifications?.sendErrors !== false;
    this.sendSummaries = config.emailNotifications?.sendSummaries !== false;
    this.sendFulfillmentAlerts = config.emailNotifications?.sendFulfillmentAlerts !== false;
    this.sendOrderAlerts = config.emailNotifications?.sendOrderAlerts !== false;
    this.sendInventoryAlerts = config.emailNotifications?.sendInventoryAlerts !== false;
    
    // Enhanced rate limiting settings
    this.minActivityThreshold = config.emailNotifications?.minActivityThreshold || 1;
    this.rateLimitMinutes = config.emailNotifications?.rateLimitMinutes || 30;
    this.quietHours = config.emailNotifications?.quietHours || { start: 22, end: 7 };
    
    // New enhanced settings
    this.maxRetries = config.emailNotifications?.maxRetries || 3;
    this.retryDelayMs = config.emailNotifications?.retryDelayMs || 5000;
    this.exponentialBackoff = config.emailNotifications?.exponentialBackoff !== false;
    this.includeDebugInfo = config.emailNotifications?.includeDebugInfo || false;
    this.emailSubjectPrefix = config.emailNotifications?.subjectPrefix || '';
    
    // GitHub Actions specific settings
    this.githubActionsMode = config.emailNotifications?.githubActionsMode || false;
    this.enhancedTemplates = config.emailNotifications?.enhancedTemplates || false;
    
    // Activity tracking enhancements
    this.activityTracking = config.emailNotifications?.activityTracking !== false;
    this.activityHistory = [];
    this.maxActivityHistory = config.emailNotifications?.maxActivityHistory || 100;
    
    // Initialize email templates
    this.templates = new EmailTemplates();
    
    // Enhanced state tracking for rate limiting
    this.lastEmailTimes = {};
    this.emailCounts = {};
    this.stateFile = path.join(__dirname, '../../logs/email-state.json');
    this.loadEmailState();
    
    // Validate configuration
    this.validateConfiguration();
  }

  validateConfiguration() {
    if (!this.apiKey) {
      console.warn('⚠️  Email notifications may fail: MAILGUN_API_KEY not configured');
    }
    if (!this.domain) {
      console.warn('⚠️  Email notifications may fail: MAILGUN_DOMAIN not configured');
    }
    if (!this.enabled) {
      console.log('📧 Email notifications are disabled');
    }
  }

  loadEmailState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const stateData = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        this.lastEmailTimes = stateData.lastEmailTimes || {};
        this.emailCounts = stateData.emailCounts || {};
        this.activityHistory = stateData.activityHistory || [];
      }
    } catch (error) {
      console.log('Could not load email state, starting fresh:', error.message);
      this.lastEmailTimes = {};
      this.emailCounts = {};
      this.activityHistory = [];
    }
  }

  saveEmailState() {
    try {
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const stateData = {
        lastEmailTimes: this.lastEmailTimes,
        emailCounts: this.emailCounts,
        activityHistory: this.activityHistory.slice(-this.maxActivityHistory),
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.stateFile, JSON.stringify(stateData, null, 2));
    } catch (error) {
      console.error('Failed to save email state:', error);
    }
  }

  isInQuietHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= this.quietHours.start || hour < this.quietHours.end;
  }

  canSendEmail(type, operation = 'general') {
    const key = `${type}_${operation}`;
    const now = Date.now();
    const lastTime = this.lastEmailTimes[key] || 0;
    const timeSinceLastEmail = now - lastTime;
    const rateLimitMs = this.rateLimitMinutes * 60 * 1000;
    
    // For GitHub Actions mode, we want to send emails immediately when there's activity
    // Only apply rate limiting for error emails to prevent spam
    if (this.isGitHubActionsEnvironment()) {
      if (type === 'error') {
        // Apply rate limiting only for errors to prevent spam
        let effectiveRateLimit = rateLimitMs;
        if (this.exponentialBackoff) {
          const errorCount = this.emailCounts[key] || 0;
          effectiveRateLimit = Math.min(rateLimitMs * Math.pow(2, errorCount), 24 * 60 * 60 * 1000); // Max 24 hours
        }
        
        if (timeSinceLastEmail < effectiveRateLimit) {
          const minutesAgo = Math.round(timeSinceLastEmail / 1000 / 60);
          console.log(`📧 Rate limited: ${type} email for ${operation} (last sent ${minutesAgo} minutes ago, limit: ${Math.round(effectiveRateLimit / 1000 / 60)} minutes)`);
          return false;
        }
      }
      // For non-error emails in GitHub Actions, always allow sending if there's activity
      return true;
    }
    
    // For non-GitHub Actions environments, apply normal rate limiting
    if (type !== 'error' && this.isInQuietHours()) {
      console.log(`📧 Skipping ${type} email during quiet hours (${this.quietHours.start}:00 - ${this.quietHours.end}:00)`);
      return false;
    }
    
    // Enhanced rate limiting with exponential backoff for errors
    let effectiveRateLimit = rateLimitMs;
    if (type === 'error' && this.exponentialBackoff) {
      const errorCount = this.emailCounts[key] || 0;
      effectiveRateLimit = Math.min(rateLimitMs * Math.pow(2, errorCount), 24 * 60 * 60 * 1000); // Max 24 hours
    }
    
    if (timeSinceLastEmail < effectiveRateLimit) {
      const minutesAgo = Math.round(timeSinceLastEmail / 1000 / 60);
      console.log(`📧 Rate limited: ${type} email for ${operation} (last sent ${minutesAgo} minutes ago, limit: ${Math.round(effectiveRateLimit / 1000 / 60)} minutes)`);
      return false;
    }
    
    return true;
  }

  updateEmailState(type, operation = 'general') {
    const key = `${type}_${operation}`;
    this.lastEmailTimes[key] = Date.now();
    this.emailCounts[key] = (this.emailCounts[key] || 0) + 1;
    this.saveEmailState();
  }

  trackActivity(operation, results) {
    if (!this.activityTracking) return;
    
    const activity = {
      timestamp: new Date().toISOString(),
      operation,
      results: this.summarizeResults(results),
      success: this.hasSignificantActivity(results)
    };
    
    this.activityHistory.push(activity);
    
    // Keep only the last N activities
    if (this.activityHistory.length > this.maxActivityHistory) {
      this.activityHistory = this.activityHistory.slice(-this.maxActivityHistory);
    }
    
    this.saveEmailState();
  }

  summarizeResults(results) {
    if (!results) return {};
    
    const summary = {};
    
    if (results.fulfillments) {
      summary.fulfillments = {
        success: results.fulfillments.success?.length || 0,
        errors: results.fulfillments.errors?.length || 0,
        total: (results.fulfillments.success?.length || 0) + (results.fulfillments.errors?.length || 0)
      };
    }
    
    if (results.orders) {
      summary.orders = {
        success: results.orders.success?.length || 0,
        errors: results.orders.errors?.length || 0,
        total: (results.orders.success?.length || 0) + (results.orders.errors?.length || 0)
      };
    }
    
    if (results.inventory) {
      summary.inventory = {
        success: results.inventory.success?.length || 0,
        errors: results.inventory.errors?.length || 0,
        total: (results.inventory.success?.length || 0) + (results.inventory.errors?.length || 0)
      };
    }
    
    return summary;
  }

  hasSignificantActivity(results) {
    if (!results) return false;
    
    let totalActivity = 0;
    let hasErrors = false;
    
    // Check fulfillments
    if (results.fulfillments) {
      const fulfillmentActivity = (results.fulfillments.success?.length || 0) + (results.fulfillments.errors?.length || 0);
      totalActivity += fulfillmentActivity;
      if (results.fulfillments.errors?.length > 0) hasErrors = true;
    }
    
    // Check orders
    if (results.orders) {
      const orderActivity = (results.orders.success?.length || 0) + (results.orders.errors?.length || 0);
      totalActivity += orderActivity;
      if (results.orders.errors?.length > 0) hasErrors = true;
    }
    
    // Check inventory
    if (results.inventory) {
      const inventoryActivity = (results.inventory.success?.length || 0) + (results.inventory.errors?.length || 0);
      totalActivity += inventoryActivity;
      if (results.inventory.errors?.length > 0) hasErrors = true;
    }
    
    // In GitHub Actions mode, always send emails if there's any activity or errors
    if (this.isGitHubActionsEnvironment()) {
      return totalActivity > 0 || hasErrors;
    }
    
    // For non-GitHub Actions environments, use the threshold
    return totalActivity >= this.minActivityThreshold;
  }

  async sendEmailWithRetry(subject, body, isError = false, htmlBody = null, operation = 'general', retryCount = 0) {
    if (!this.enabled) {
      console.log(`📧 Email notification disabled. Would send: ${subject}`);
      return;
    }

    const emailType = isError ? 'error' : 'info';
    
    if (!this.canSendEmail(emailType, operation)) {
      return;
    }

    try {
      await this.sendEmail(subject, body, isError, htmlBody, operation);
      console.log(`📧 Email sent successfully: ${subject}`);
    } catch (error) {
      console.error(`📧 Failed to send email (attempt ${retryCount + 1}/${this.maxRetries + 1}):`, error.message);
      
      if (retryCount < this.maxRetries) {
        const delay = this.exponentialBackoff ? this.retryDelayMs * Math.pow(2, retryCount) : this.retryDelayMs;
        console.log(`📧 Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendEmailWithRetry(subject, body, isError, htmlBody, operation, retryCount + 1);
      } else {
        console.error(`📧 Max retries exceeded for email: ${subject}`);
        throw error;
      }
    }
  }

  async sendEmail(subject, body, isError = false, htmlBody = null, operation = 'general') {
    const emailType = isError ? 'error' : 'info';
    
    const data = new URLSearchParams({
      from: `LGL Admin <${this.fromEmail}>`,
      to: this.toEmail,
      'h:Reply-To': this.fromEmail,
      subject: `${this.emailSubjectPrefix}${subject}`,
      text: body
    });

    if (htmlBody) {
      data.append('html', htmlBody);
    }

    // Add debug info if enabled
    if (this.includeDebugInfo) {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        operation,
        emailType,
        rateLimitInfo: {
          lastEmailTime: this.lastEmailTimes[`${emailType}_${operation}`],
          emailCount: this.emailCounts[`${emailType}_${operation}`] || 0
        }
      };
      data.append('h:X-Debug-Info', JSON.stringify(debugInfo));
    }

    const options = {
      hostname: 'api.mailgun.net',
      port: 443,
      path: `/v3/${this.domain}/messages`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data.toString())
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            this.updateEmailState(emailType, operation);
            resolve();
          } else {
            const error = new Error(`Email send failed: ${res.statusCode} - ${responseData}`);
            error.statusCode = res.statusCode;
            error.responseData = responseData;
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('📧 Email request error:', error);
        reject(error);
      });

      // Add timeout
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Email request timeout'));
      });

      req.write(data.toString());
      req.end();
    });
  }

  async sendErrorNotification(error, context = {}) {
    if (!this.sendErrors) {
      console.log('📧 Error notifications disabled');
      return;
    }

    const subject = `Error: ${context.retailer || 'System'} - ${context.operation || 'Unknown'}`;
    const timestamp = new Date().toISOString();
    
    const textBody = `
Shopify Sync System Error

Time: ${timestamp}
Retailer: ${context.retailer || 'Unknown'}
Operation: ${context.operation || 'Unknown'}

Error Details:
${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}

Additional Context:
${JSON.stringify(context, null, 2)}
    `.trim();

    const htmlBody = this.templates.generateErrorTemplate({
      error,
      context,
      timestamp
    });

    try {
      await this.sendEmailWithGitHubContext(subject, textBody, true, htmlBody, context.operation || 'error');
    } catch (emailError) {
      console.error('📧 Failed to send error notification email:', emailError);
    }
  }

  async sendFulfillmentAlert(results) {
    if (!this.sendFulfillmentAlerts || !results?.fulfillments) {
      return;
    }

    // Use the actual total from the results, not calculated from arrays
    const totalFulfillments = results.fulfillments.total || 0;
    if (totalFulfillments === 0) {
      return;
    }

    this.trackActivity('fulfillments', results);

    const subject = `Fulfillment: ${totalFulfillments} orders processed`;
    const timestamp = new Date().toISOString();
    
    const textBody = `
Fulfillment Processing Alert

Time: ${timestamp}
Total Fulfillments: ${totalFulfillments}
Successful: ${results.fulfillments.success?.length || 0}
Errors: ${results.fulfillments.errors?.length || 0}

Details:
${JSON.stringify(results.fulfillments, null, 2)}
    `.trim();

    const htmlBody = this.templates.generateFulfillmentTemplate({
      fulfillments: results.fulfillments,
      timestamp
    });

    try {
      await this.sendEmailWithGitHubContext(subject, textBody, false, htmlBody, 'fulfillments');
    } catch (emailError) {
      console.error('📧 Failed to send fulfillment alert email:', emailError);
    }
  }

  async sendOrderAlert(results) {
    if (!this.sendOrderAlerts || !results?.orders) {
      return;
    }

    // Use the actual total from the results, not calculated from arrays
    const totalOrders = results.orders.total || 0;
    if (totalOrders === 0) {
      return;
    }

    this.trackActivity('orders', results);

    const subject = `Orders: ${totalOrders} imported`;
    const timestamp = new Date().toISOString();
    
    const textBody = `
Order Import Alert

Time: ${timestamp}
Total Orders: ${totalOrders}
Successful: ${results.orders.success?.length || 0}
Errors: ${results.orders.errors?.length || 0}

Details:
${JSON.stringify(results.orders, null, 2)}
    `.trim();

    const htmlBody = this.templates.generateOrderTemplate({
      orders: results.orders,
      timestamp
    });

    try {
      await this.sendEmailWithGitHubContext(subject, textBody, false, htmlBody, 'orders');
    } catch (emailError) {
      console.error('📧 Failed to send order alert email:', emailError);
    }
  }

  async sendInventoryAlert(results) {
    if (!this.sendInventoryAlerts || !results?.inventory) {
      return;
    }

    // Use the actual total from the results, not calculated from arrays
    const totalInventory = results.inventory.total || 0;
    if (totalInventory === 0) {
      return;
    }

    this.trackActivity('inventory', results);

    const subject = `Inventory: ${totalInventory} SKUs updated`;
    const timestamp = new Date().toISOString();
    
    const textBody = `
Inventory Sync Alert

Time: ${timestamp}
Total SKUs: ${totalInventory}
Successful: ${results.inventory.success?.length || 0}
Errors: ${results.inventory.errors?.length || 0}

Details:
${JSON.stringify(results.inventory, null, 2)}
    `.trim();

    const htmlBody = this.templates.generateInventoryTemplate({
      inventory: results.inventory,
      timestamp
    });

    try {
      await this.sendEmailWithGitHubContext(subject, textBody, false, htmlBody, 'inventory');
    } catch (emailError) {
      console.error('📧 Failed to send inventory alert email:', emailError);
    }
  }

  async sendSummaryNotification(summary) {
    if (!this.sendSummaries) {
      return;
    }

    // Only send summary if there's significant activity
    if (!this.hasSignificantActivity(summary.results)) {
      console.log('📧 No significant activity detected, skipping summary email');
      return;
    }

    this.trackActivity('summary', summary.results);

    const subject = `Summary: ${new Date().toLocaleDateString()}`;
    const timestamp = new Date().toISOString();
    
    const textBody = `
Shopify Sync System Summary

Time: ${timestamp}
Status: ${summary.status.toUpperCase()}
Duration: ${summary.duration ? Math.round(summary.duration / 1000) : 'N/A'} seconds
Retailers: ${summary.retailers?.join(', ') || 'None'}

Summary:
${JSON.stringify(summary, null, 2)}
    `.trim();

    const retailerSections = this.templates.generateRetailerSections(summary.results);
    const htmlBody = this.templates.generateSummaryTemplate({
      summary,
      timestamp,
      retailerSections
    });

    try {
      await this.sendEmailWithGitHubContext(subject, textBody, false, htmlBody, 'summary');
    } catch (emailError) {
      console.error('📧 Failed to send summary notification email:', emailError);
    }
  }

  // New method to get email statistics
  getEmailStats() {
    const now = Date.now();
    const stats = {
      totalEmails: Object.values(this.emailCounts).reduce((sum, count) => sum + count, 0),
      emailCounts: this.emailCounts,
      lastEmailTimes: {},
      activityHistory: this.activityHistory.length,
      isInQuietHours: this.isInQuietHours()
    };

    // Convert timestamps to readable format
    Object.keys(this.lastEmailTimes).forEach(key => {
      const timestamp = this.lastEmailTimes[key];
      const minutesAgo = Math.round((now - timestamp) / 1000 / 60);
      stats.lastEmailTimes[key] = `${minutesAgo} minutes ago`;
    });

    return stats;
  }

  // New method to reset email state (useful for troubleshooting)
  resetEmailState() {
    this.lastEmailTimes = {};
    this.emailCounts = {};
    this.activityHistory = [];
    this.saveEmailState();
    console.log('📧 Email state reset successfully');
  }

  // GitHub Actions specific method
  isGitHubActionsEnvironment() {
    return process.env.GITHUB_ACTIONS === 'true' || this.githubActionsMode;
  }

  // Enhanced subject line for GitHub Actions
  getEnhancedSubject(subject, operation = 'general') {
    if (this.isGitHubActionsEnvironment()) {
      const runId = process.env.GITHUB_RUN_ID || 'unknown';
      const runNumber = process.env.GITHUB_RUN_NUMBER || 'unknown';
      return `${this.emailSubjectPrefix}[Run #${runNumber}] ${subject}`;
    }
    return `${this.emailSubjectPrefix}${subject}`;
  }

  // Enhanced email sending with GitHub Actions context
  async sendEmailWithGitHubContext(subject, body, isError = false, htmlBody = null, operation = 'general') {
    const enhancedSubject = this.getEnhancedSubject(subject, operation);
    
    // Add GitHub Actions context to email body if available
    let enhancedBody = body;
    if (this.isGitHubActionsEnvironment() && this.includeDebugInfo) {
      const githubContext = {
        runId: process.env.GITHUB_RUN_ID,
        runNumber: process.env.GITHUB_RUN_NUMBER,
        workflow: process.env.GITHUB_WORKFLOW,
        repository: process.env.GITHUB_REPOSITORY,
        actor: process.env.GITHUB_ACTOR,
        eventName: process.env.GITHUB_EVENT_NAME
      };
      
      enhancedBody += `\n\nGitHub Actions Context:\n${JSON.stringify(githubContext, null, 2)}`;
    }
    
    return this.sendEmailWithRetry(enhancedSubject, enhancedBody, isError, htmlBody, operation);
  }
}

module.exports = { EmailNotifier }; 