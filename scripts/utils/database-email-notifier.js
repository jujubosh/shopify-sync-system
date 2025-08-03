const https = require('https');
const { supabase, TABLES } = require('../../config/database');
const { EmailTemplates } = require('./email-templates');

class DatabaseEmailNotifier {
  constructor(config) {
    // Use config Mailgun credentials if available, otherwise fall back to environment variables
    this.apiKey = this.getConfigValue(config.mailgun?.apiKey, process.env.MAILGUN_API_KEY);
    this.domain = this.getConfigValue(config.mailgun?.domain, process.env.MAILGUN_DOMAIN);
    this.baseUrl = 'https://api.mailgun.net';
    this.fromEmail = this.getConfigValue(config.emailNotifications?.fromEmail, process.env.EMAIL_FROM, 'admin@livegoodlogistics.com');
    this.toEmail = this.getConfigValue(config.emailNotifications?.toEmail, process.env.EMAIL_TO, 'justin@livegoodlogistics.com');
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
    
    // Initialize email templates
    this.templates = new EmailTemplates();
    
    // Validate configuration
    this.validateConfiguration();
  }

  getConfigValue(configValue, envValue, defaultValue = null) {
    // If config value is an environment variable name, use the env value
    if (configValue && configValue.startsWith('MAILGUN_') || configValue && configValue.startsWith('EMAIL_')) {
      return envValue || defaultValue;
    }
    // If config value is a direct value, use it
    if (configValue && !configValue.startsWith('MAILGUN_') && !configValue.startsWith('EMAIL_')) {
      return configValue;
    }
    // Otherwise use env value or default
    return envValue || defaultValue;
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

  async getLastEmailTime(type, operation = 'general') {
    try {
      const { data, error } = await supabase
        .from(TABLES.EMAIL_NOTIFICATIONS)
        .select('sent_at')
        .eq('type', type)
        .eq('recipient', this.toEmail)
        .order('sent_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching last email time:', error);
        return null;
      }

      return data && data.length > 0 ? new Date(data[0].sent_at).getTime() : null;
    } catch (error) {
      console.error('Error getting last email time:', error);
      return null;
    }
  }

  async getEmailCount(type, operation = 'general', hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000)).toISOString();
      
      const { data, error } = await supabase
        .from(TABLES.EMAIL_NOTIFICATIONS)
        .select('id')
        .eq('type', type)
        .eq('recipient', this.toEmail)
        .gte('sent_at', cutoffTime);

      if (error) {
        console.error('Error fetching email count:', error);
        return 0;
      }

      return data ? data.length : 0;
    } catch (error) {
      console.error('Error getting email count:', error);
      return 0;
    }
  }

  async logEmailNotification(type, subject, body, htmlBody = null, operation = 'general') {
    try {
      const { error } = await supabase
        .from(TABLES.EMAIL_NOTIFICATIONS)
        .insert({
          type: type,
          recipient: this.toEmail,
          subject: subject,
          body: body,
          html_body: htmlBody,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });

      if (error) {
        console.error('Error logging email notification:', error);
      }
    } catch (error) {
      console.error('Error logging email notification:', error);
    }
  }

  async logActivity(operation, results, success = true, durationMs = null) {
    if (!this.activityTracking) {
      console.log('📊 Activity tracking disabled, skipping database log');
      return;
    }

    try {
      console.log(`📊 Logging activity to database: ${operation} (success: ${success})`);
      const { error } = await supabase
        .from(TABLES.ACTIVITY_LOGS)
        .insert({
          operation: operation,
          success: success,
          details: this.summarizeResults(results),
          duration_ms: durationMs,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging activity:', error);
      } else {
        console.log(`✅ Activity logged successfully: ${operation}`);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
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
        success: results.inventory.successfulUpdates || 0,
        errors: results.inventory.failures || 0,
        total: results.inventory.total || 0
      };
    }
    
    return summary;
  }

  isInQuietHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= this.quietHours.start || hour < this.quietHours.end;
  }

  async canSendEmail(type, operation = 'general') {
    const now = Date.now();
    const lastTime = await this.getLastEmailTime(type, operation);
    const timeSinceLastEmail = lastTime ? now - lastTime : Infinity;
    const rateLimitMs = this.rateLimitMinutes * 60 * 1000;
    
    // For GitHub Actions mode, we want to send emails immediately when there's activity
    // Only apply rate limiting for error emails to prevent spam
    if (this.isGitHubActionsEnvironment()) {
      if (type === 'error') {
        // Apply rate limiting only for errors to prevent spam
        let effectiveRateLimit = rateLimitMs;
        if (this.exponentialBackoff) {
          const errorCount = await this.getEmailCount(type, operation, 24);
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
      const errorCount = await this.getEmailCount(type, operation, 24);
      effectiveRateLimit = Math.min(rateLimitMs * Math.pow(2, errorCount), 24 * 60 * 60 * 1000); // Max 24 hours
    }
    
    if (timeSinceLastEmail < effectiveRateLimit) {
      const minutesAgo = Math.round(timeSinceLastEmail / 1000 / 60);
      console.log(`📧 Rate limited: ${type} email for ${operation} (last sent ${minutesAgo} minutes ago, limit: ${Math.round(effectiveRateLimit / 1000 / 60)} minutes)`);
      return false;
    }
    
    return true;
  }

  hasSignificantActivity(results) {
    if (!results) {
      console.log('🔍 No results provided to hasSignificantActivity');
      return false;
    }
    
    let totalActivity = 0;
    let hasErrors = false;
    
    console.log('🔍 Checking for significant activity:', JSON.stringify(results, null, 2));
    
    // Check fulfillments
    if (results.fulfillments) {
      const fulfillmentActivity = results.fulfillments.total || 0;
      totalActivity += fulfillmentActivity;
      if (results.fulfillments.errors?.length > 0) hasErrors = true;
      console.log(`📦 Fulfillments: ${fulfillmentActivity} activity, ${results.fulfillments.errors?.length || 0} errors`);
    }
    
    // Check orders
    if (results.orders) {
      const orderActivity = results.orders.total || 0;
      totalActivity += orderActivity;
      if (results.orders.errors?.length > 0) hasErrors = true;
      console.log(`📦 Orders: ${orderActivity} activity, ${results.orders.errors?.length || 0} errors`);
    }
    
    // Check inventory
    if (results.inventory) {
      const inventoryActivity = results.inventory.total || 0;
      totalActivity += inventoryActivity;
      if (results.inventory.failures > 0) hasErrors = true;
      console.log(`📦 Inventory: ${inventoryActivity} activity, ${results.inventory.failures || 0} failures`);
    }
    
    console.log(`📊 Total activity: ${totalActivity}, Has errors: ${hasErrors}`);
    
    // In GitHub Actions mode, always send emails if there's any activity or errors
    if (this.isGitHubActionsEnvironment()) {
      const shouldSend = totalActivity > 0 || hasErrors;
      console.log(`🚀 GitHub Actions mode: ${shouldSend ? 'SEND' : 'SKIP'} email`);
      return shouldSend;
    }
    
    // For non-GitHub Actions environments, use the threshold
    const shouldSend = totalActivity >= this.minActivityThreshold;
    console.log(`🏠 Local mode: ${shouldSend ? 'SEND' : 'SKIP'} email (threshold: ${this.minActivityThreshold})`);
    return shouldSend;
  }

  async sendEmailWithRetry(subject, body, isError = false, htmlBody = null, operation = 'general', retryCount = 0) {
    if (!this.enabled) {
      console.log(`📧 Email notification disabled. Would send: ${subject}`);
      return;
    }

    const emailType = isError ? 'error' : 'info';
    
    if (!(await this.canSendEmail(emailType, operation))) {
      return;
    }

    try {
      await this.sendEmail(subject, body, isError, htmlBody, operation);
      await this.logEmailNotification(emailType, subject, body, htmlBody, operation);
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
        emailType: isError ? 'error' : 'info'
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
    console.log('🔍 sendFulfillmentAlert called with:', JSON.stringify(results?.fulfillments, null, 2));
    
    if (!this.sendFulfillmentAlerts || !results?.fulfillments) {
      console.log('📧 Fulfillment alerts disabled or no fulfillments results');
      return;
    }

    // Use the actual total from results, not calculated from arrays
    const totalFulfillments = results.fulfillments.total || 0;
    console.log(`📧 Total fulfillments: ${totalFulfillments}`);
    
    if (totalFulfillments === 0) {
      console.log('📧 No fulfillments to process, skipping email');
      return;
    }

    await this.logActivity('fulfillments', results, true);

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

    // Use the actual total from results, not calculated from arrays
    const totalOrders = results.orders.total || 0;
    if (totalOrders === 0) {
      return;
    }

    await this.logActivity('orders', results, true);

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

    // Use the actual total from results, not calculated from arrays
    const totalInventory = results.inventory.total || 0;
    if (totalInventory === 0) {
      return;
    }

    await this.logActivity('inventory', results, true);

    const subject = `Inventory: ${totalInventory} SKUs updated`;
    const timestamp = new Date().toISOString();
    
    const textBody = `
Inventory Sync Alert

Time: ${timestamp}
Total SKUs: ${totalInventory}
Successful Updates: ${results.inventory.successfulUpdates || 0}
Location Mismatches: ${results.inventory.locationMismatches || 0}
Failures: ${results.inventory.failures || 0}

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

    await this.logActivity('summary', summary.results, true);

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

  // Get email statistics from database
  async getEmailStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
      
      const { data: recentEmails, error: emailError } = await supabase
        .from(TABLES.EMAIL_NOTIFICATIONS)
        .select('type, sent_at')
        .gte('sent_at', oneDayAgo)
        .order('sent_at', { ascending: false });

      const { data: recentActivities, error: activityError } = await supabase
        .from(TABLES.ACTIVITY_LOGS)
        .select('operation, success, created_at')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

      if (emailError) {
        console.error('Error fetching email stats:', emailError);
      }
      if (activityError) {
        console.error('Error fetching activity stats:', activityError);
      }

      const stats = {
        totalEmails24h: recentEmails?.length || 0,
        emailTypes: {},
        totalActivities24h: recentActivities?.length || 0,
        successfulActivities: recentActivities?.filter(a => a.success).length || 0,
        isInQuietHours: this.isInQuietHours()
      };

      // Count email types
      if (recentEmails) {
        recentEmails.forEach(email => {
          stats.emailTypes[email.type] = (stats.emailTypes[email.type] || 0) + 1;
        });
      }

      return stats;
    } catch (error) {
      console.error('Error getting email stats:', error);
      return { error: error.message };
    }
  }
}

module.exports = { DatabaseEmailNotifier }; 