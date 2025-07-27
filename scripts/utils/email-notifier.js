const https = require('https');

class EmailNotifier {
  constructor(config) {
    this.apiKey = process.env.MAILGUN_API_KEY;
    this.domain = process.env.MAILGUN_DOMAIN;
    this.baseUrl = 'https://api.mailgun.net';
    this.fromEmail = 'shopify-sync@livegoodlogistics.com';
    this.toEmail = config.emailNotifications?.toEmail || 'justin@livegoodlogistics.com';
    this.enabled = config.emailNotifications?.enabled !== false;
  }

  async sendEmail(subject, body, isError = false) {
    if (!this.enabled) {
      console.log(`Email notification disabled. Would send: ${subject}`);
      return;
    }

    const data = new URLSearchParams({
      from: this.fromEmail,
      to: this.toEmail,
      subject: isError ? `[ERROR] ${subject}` : `[INFO] ${subject}`,
      text: body
    });

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
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Email sent successfully: ${subject}`);
            resolve(responseData);
          } else {
            console.error(`Failed to send email: ${res.statusCode} - ${responseData}`);
            reject(new Error(`Email send failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('Email request error:', error);
        reject(error);
      });

      req.write(data.toString());
      req.end();
    });
  }

  async sendErrorNotification(error, context = {}) {
    const subject = `Shopify Sync Error - ${context.retailer || 'Unknown Retailer'}`;
    const body = `
Shopify Sync System Error

Time: ${new Date().toISOString()}
Retailer: ${context.retailer || 'Unknown'}
Operation: ${context.operation || 'Unknown'}

Error Details:
${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}

Additional Context:
${JSON.stringify(context, null, 2)}
    `.trim();

    try {
      await this.sendEmail(subject, body, true);
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError);
    }
  }

  async sendSummaryNotification(summary) {
    const subject = `Shopify Sync Summary - ${new Date().toLocaleDateString()}`;
    const body = `
Shopify Sync System Summary

Time: ${new Date().toISOString()}

Summary:
${JSON.stringify(summary, null, 2)}
    `.trim();

    try {
      await this.sendEmail(subject, body, false);
    } catch (emailError) {
      console.error('Failed to send summary notification email:', emailError);
    }
  }
}

module.exports = { EmailNotifier }; 