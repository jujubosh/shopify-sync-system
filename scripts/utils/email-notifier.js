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

  async sendEmail(subject, body, isError = false, htmlBody = null) {
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

    if (htmlBody) {
      data.append('html', htmlBody);
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

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #dc3545; color: white; padding: 15px; border-radius: 5px; }
        .content { margin: 20px 0; }
        .error-details { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; }
        .context { background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-top: 15px; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🚨 Shopify Sync System Error</h2>
    </div>
    <div class="content">
        <p><strong>Time:</strong> ${timestamp}</p>
        <p><strong>Retailer:</strong> ${context.retailer || 'Unknown'}</p>
        <p><strong>Operation:</strong> ${context.operation || 'Unknown'}</p>
        
        <div class="error-details">
            <h3>Error Details:</h3>
            <p>${error.message}</p>
        </div>
        
        <div class="context">
            <h3>Additional Context:</h3>
            <pre>${JSON.stringify(context, null, 2)}</pre>
        </div>
    </div>
</body>
</html>
    `.trim();

    try {
      await this.sendEmail(subject, textBody, true, htmlBody);
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError);
    }
  }

  async sendSummaryNotification(summary) {
    const subject = `Shopify Sync Summary - ${new Date().toLocaleDateString()}`;
    const timestamp = new Date().toISOString();
    
    const textBody = `
Shopify Sync System Summary

Time: ${timestamp}

Summary:
${JSON.stringify(summary, null, 2)}
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #28a745; color: white; padding: 15px; border-radius: 5px; }
        .content { margin: 20px 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #6c757d; margin-top: 5px; }
        .section { margin: 20px 0; }
        .section h3 { color: #495057; border-bottom: 2px solid #dee2e6; padding-bottom: 5px; }
        .error-item { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .success-item { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .details { background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-top: 15px; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <div class="header">
        <h2>📊 Shopify Sync System Summary</h2>
    </div>
    <div class="content">
        <p><strong>Time:</strong> ${timestamp}</p>
        <p><strong>Status:</strong> <span style="color: ${summary.status === 'success' ? '#28a745' : '#dc3545'}; font-weight: bold;">${summary.status.toUpperCase()}</span></p>
        <p><strong>Duration:</strong> ${summary.duration ? Math.round(summary.duration / 1000) : 'N/A'} seconds</p>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${summary.results?.fulfillments?.total || 0}</div>
                <div class="stat-label">Fulfillments Processed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.results?.orders?.total || 0}</div>
                <div class="stat-label">Orders Imported</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${summary.results?.inventory?.total || 0}</div>
                <div class="stat-label">SKUs Updated</div>
            </div>
        </div>
        
        ${summary.results?.fulfillments?.errors?.length ? `
        <div class="section">
            <h3>❌ Fulfillment Errors (${summary.results.fulfillments.errors.length})</h3>
            ${summary.results.fulfillments.errors.map(error => `
                <div class="error-item">
                    <strong>${error.retailer || 'Unknown'}:</strong> ${error.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${summary.results?.orders?.errors?.length ? `
        <div class="section">
            <h3>❌ Order Import Errors (${summary.results.orders.errors.length})</h3>
            ${summary.results.orders.errors.map(error => `
                <div class="error-item">
                    <strong>${error.retailer || 'Unknown'}:</strong> ${error.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${summary.results?.inventory?.errors?.length ? `
        <div class="section">
            <h3>❌ Inventory Sync Errors (${summary.results.inventory.errors.length})</h3>
            ${summary.results.inventory.errors.map(error => `
                <div class="error-item">
                    <strong>${error.retailer || 'Unknown'}:</strong> ${error.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${summary.results?.fulfillments?.success?.length ? `
        <div class="section">
            <h3>✅ Successful Fulfillments (${summary.results.fulfillments.success.length})</h3>
            ${summary.results.fulfillments.success.map(item => `
                <div class="success-item">
                    <strong>${item.retailer || 'Unknown'}:</strong> ${item.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${summary.results?.orders?.success?.length ? `
        <div class="section">
            <h3>✅ Successful Order Imports (${summary.results.orders.success.length})</h3>
            ${summary.results.orders.success.map(item => `
                <div class="success-item">
                    <strong>${item.retailer || 'Unknown'}:</strong> ${item.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${summary.results?.inventory?.success?.length ? `
        <div class="section">
            <h3>✅ Successful Inventory Updates (${summary.results.inventory.success.length})</h3>
            ${summary.results.inventory.success.map(item => `
                <div class="success-item">
                    <strong>${item.retailer || 'Unknown'}:</strong> ${item.message}
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="details">
            <h3>Full Summary Details:</h3>
            <pre>${JSON.stringify(summary, null, 2)}</pre>
        </div>
    </div>
</body>
</html>
    `.trim();

    try {
      await this.sendEmail(subject, textBody, false, htmlBody);
    } catch (emailError) {
      console.error('Failed to send summary notification email:', emailError);
    }
  }
}

module.exports = { EmailNotifier }; 