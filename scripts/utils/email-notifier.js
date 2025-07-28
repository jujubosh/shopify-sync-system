const https = require('https');
const fs = require('fs');
const path = require('path');

class EmailNotifier {
  constructor(config) {
    this.apiKey = process.env.MAILGUN_API_KEY;
    this.domain = process.env.MAILGUN_DOMAIN;
    this.baseUrl = 'https://api.mailgun.net';
    this.fromEmail = 'shopify-sync@livegoodlogistics.com';
    this.toEmail = config.emailNotifications?.toEmail || 'justin@livegoodlogistics.com';
    this.enabled = config.emailNotifications?.enabled !== false;
    
    // Load logo
    try {
      const logoPath = path.join(process.cwd(), 'Live-Good-Word_Green_Final.png');
      const logoBuffer = fs.readFileSync(logoPath);
      this.logoBase64 = logoBuffer.toString('base64');
    } catch (error) {
      console.warn('Could not load logo:', error.message);
      this.logoBase64 = null;
    }
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
          if (res.statusCode === 200) {
            console.log(`Email sent successfully: ${subject}`);
            resolve();
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 700px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 25px; text-align: center; }
        .header-content { display: flex; align-items: center; justify-content: center; gap: 15px; }
        .logo { width: 120px; height: auto; }
        .header-text { text-align: left; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header .subtitle { margin-top: 5px; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .error-details { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .context { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-top: 20px; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .info-item { background-color: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
        .info-label { font-size: 12px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .info-value { font-weight: 600; color: #495057; }
        pre { white-space: pre-wrap; word-wrap: break-word; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6; font-size: 12px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="data:image/png;base64,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" alt="Live Good Logistics" class="logo">
                <div class="header-text">
                    <h1>🚨 Shopify Sync System Error</h1>
                    <div class="subtitle">Critical system error detected</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Time</div>
                    <div class="info-value">${new Date(timestamp).toLocaleString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Retailer</div>
                    <div class="info-value">${context.retailer || 'Unknown'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Operation</div>
                    <div class="info-value">${context.operation || 'Unknown'}</div>
                </div>
            </div>
            
            <div class="error-details">
                <h3 style="margin-top: 0; color: #721c24;">Error Details</h3>
                <p style="margin: 0; font-weight: 500;">${error.message}</p>
            </div>
            
            <div class="context">
                <h3 style="margin-top: 0; color: #495057;">Additional Context</h3>
                <pre>${JSON.stringify(context, null, 2)}</pre>
            </div>
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

  generateRetailerSections(results) {
    if (!results) return '';
    
    let sections = '';
    
    // Group results by retailer
    const retailerData = {};
    
    // Process fulfillments
    if (results.fulfillments) {
      results.fulfillments.success?.forEach(item => {
        if (!retailerData[item.retailer]) retailerData[item.retailer] = { success: [], errors: [] };
        retailerData[item.retailer].success.push({ type: 'fulfillment', message: item.message });
      });
      results.fulfillments.errors?.forEach(item => {
        if (!retailerData[item.retailer]) retailerData[item.retailer] = { success: [], errors: [] };
        retailerData[item.retailer].errors.push({ type: 'fulfillment', message: item.message });
      });
    }
    
    // Process orders
    if (results.orders) {
      results.orders.success?.forEach(item => {
        if (!retailerData[item.retailer]) retailerData[item.retailer] = { success: [], errors: [] };
        retailerData[item.retailer].success.push({ type: 'order', message: item.message });
      });
      results.orders.errors?.forEach(item => {
        if (!retailerData[item.retailer]) retailerData[item.retailer] = { success: [], errors: [] };
        retailerData[item.retailer].errors.push({ type: 'order', message: item.message });
      });
    }
    
    // Process inventory
    if (results.inventory) {
      results.inventory.success?.forEach(item => {
        if (!retailerData[item.retailer]) retailerData[item.retailer] = { success: [], errors: [] };
        retailerData[item.retailer].success.push({ type: 'inventory', message: item.message });
      });
      results.inventory.errors?.forEach(item => {
        if (!retailerData[item.retailer]) retailerData[item.retailer] = { success: [], errors: [] };
        retailerData[item.retailer].errors.push({ type: 'inventory', message: item.message });
      });
    }
    
    // Generate sections for each retailer
    Object.keys(retailerData).forEach(retailer => {
      const data = retailerData[retailer];
      const totalSuccess = data.success.length;
      const totalErrors = data.errors.length;
      
      if (totalSuccess === 0 && totalErrors === 0) return;
      
      sections += `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">🏪</span>
                <h3 class="section-title">${retailer}</h3>
                <span class="section-count">${totalSuccess + totalErrors}</span>
            </div>
            
            ${totalSuccess > 0 ? `
            <div class="retailer-group">
                <div class="retailer-header">✅ Successful Operations (${totalSuccess})</div>
                ${data.success.map(item => `
                    <div class="success-item">
                        <strong>${item.type.toUpperCase()}:</strong> ${item.message}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${totalErrors > 0 ? `
            <div class="retailer-group">
                <div class="retailer-header">❌ Errors (${totalErrors})</div>
                ${data.errors.map(item => `
                    <div class="error-item">
                        <strong>${item.type.toUpperCase()}:</strong> ${item.message}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
      `;
    });
    
    return sections;
  }

  async sendSummaryNotification(summary) {
    const subject = `Shopify Sync Summary - ${new Date().toLocaleDateString()}`;
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

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 900px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 25px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header .subtitle { margin-top: 5px; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; }
        .overview { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px; }
        .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .overview-item { text-align: center; }
        .overview-number { font-size: 24px; font-weight: bold; color: #007bff; }
        .overview-label { font-size: 12px; color: #6c757d; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 25px 0; }
        .stat-card { background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border: 1px solid #e9ecef; border-radius: 10px; padding: 20px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #007bff; margin-bottom: 5px; }
        .stat-label { color: #6c757d; font-size: 14px; font-weight: 500; }
        .section { margin: 25px 0; }
        .section-header { display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; }
        .section-icon { font-size: 20px; margin-right: 10px; }
        .section-title { color: #495057; font-size: 18px; font-weight: 600; margin: 0; }
        .section-count { background-color: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 10px; }
        .retailer-group { margin: 15px 0; }
        .retailer-header { background-color: #e9ecef; padding: 10px 15px; border-radius: 5px; margin-bottom: 10px; font-weight: 600; color: #495057; }
        .item { padding: 12px 15px; margin: 8px 0; border-radius: 6px; border-left: 4px solid; }
        .success-item { background-color: #d4edda; border-color: #28a745; color: #155724; }
        .error-item { background-color: #f8d7da; border-color: #dc3545; color: #721c24; }
        .warning-item { background-color: #fff3cd; border-color: #ffc107; color: #856404; }
        .details { background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-top: 25px; }
        .details h3 { color: #495057; margin-top: 0; }
        pre { white-space: pre-wrap; word-wrap: break-word; background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6; font-size: 12px; overflow-x: auto; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status-success { background-color: #d4edda; color: #155724; }
        .status-error { background-color: #f8d7da; color: #721c24; }
        .retailers-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .retailer-tag { background-color: #007bff; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="data:image/png;base64,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" alt="Live Good Logistics" class="logo">
                <div class="header-text">
                    <h1>📊 Shopify Sync System Summary</h1>
                    <div class="subtitle">Automated synchronization report</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="overview">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <strong>Execution Time:</strong> ${new Date(timestamp).toLocaleString()}
                    </div>
                    <span class="status-badge status-${summary.status === 'success' ? 'success' : 'error'}">
                        ${summary.status.toUpperCase()}
                    </span>
                </div>
                <div style="color: #6c757d; font-size: 14px;">
                    <strong>Duration:</strong> ${summary.duration ? Math.round(summary.duration / 1000) : 'N/A'} seconds
                </div>
                <div class="retailers-list">
                    <strong>Retailers:</strong>
                    ${summary.retailers?.map(r => `<span class="retailer-tag">${r}</span>`).join('') || 'None'}
                </div>
            </div>
            
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
            
            ${this.generateRetailerSections(summary.results)}
            
            <div class="details">
                <h3>📋 Full Summary Details</h3>
                <pre>${JSON.stringify(summary, null, 2)}</pre>
            </div>
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