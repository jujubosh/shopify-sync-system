const fs = require('fs');
const path = require('path');

class EmailTemplates {
  constructor() {
    this.logoUrl = 'https://livegoodlogistics.com/cdn/shop/files/Live-Good-Word_Green_Final.png?v=1701960683&width=300';
  }

  getBaseStyles() {
    return `
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        margin: 0; 
        padding: 20px; 
        background-color: #f8f9fa; 
        line-height: 1.6;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      .container { 
        max-width: 700px; 
        margin: 0 auto; 
        background-color: white; 
        border-radius: 12px; 
        box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
        overflow: hidden; 
      }
      .header { 
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
        color: white; 
        padding: 30px; 
        text-align: center; 
      }
      .header-content { 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        gap: 20px; 
        flex-wrap: wrap;
      }
      .logo { 
        width: 250px; 
        height: auto; 
        border-radius: 8px;
        max-width: 100%;
      }
      .header-text { 
        text-align: left; 
        flex: 1;
        min-width: 200px;
      }
      .header h1 { 
        margin: 0; 
        font-size: 28px; 
        font-weight: 600; 
        word-wrap: break-word;
      }
      .header .subtitle { 
        margin-top: 8px; 
        opacity: 0.9; 
        font-size: 16px; 
      }
      .content { 
        padding: 35px; 
      }
      .stats { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
        gap: 20px; 
        margin: 25px 0; 
      }
      .stat-card { 
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); 
        border: 1px solid #e9ecef; 
        border-radius: 12px; 
        padding: 25px; 
        text-align: center; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: transform 0.2s ease;
      }
      .stat-card:hover {
        transform: translateY(-2px);
      }
      .stat-number { 
        font-size: 2.5em; 
        font-weight: bold; 
        margin-bottom: 8px; 
      }
      .stat-label { 
        color: #6c757d; 
        font-size: 14px; 
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .item { 
        padding: 15px 20px; 
        margin: 10px 0; 
        border-radius: 8px; 
        border-left: 4px solid; 
        font-size: 14px;
        word-wrap: break-word;
      }
      .success-item { 
        background-color: #d4edda; 
        border-color: #28a745; 
        color: #155724; 
      }
      .error-item { 
        background-color: #f8d7da; 
        border-color: #dc3545; 
        color: #721c24; 
      }
      .warning-item { 
        background-color: #fff3cd; 
        border-color: #ffc107; 
        color: #856404; 
      }
      .section { 
        margin: 30px 0; 
      }
      .section-header { 
        display: flex; 
        align-items: center; 
        margin-bottom: 20px; 
        padding-bottom: 15px; 
        border-bottom: 2px solid #e9ecef; 
        flex-wrap: wrap;
      }
      .section-icon { 
        font-size: 24px; 
        margin-right: 15px; 
      }
      .section-title { 
        color: #495057; 
        font-size: 20px; 
        font-weight: 600; 
        margin: 0; 
        flex: 1;
        min-width: 150px;
      }
      .section-count { 
        background-color: #007bff; 
        color: white; 
        padding: 4px 12px; 
        border-radius: 20px; 
        font-size: 12px; 
        margin-left: 15px; 
        font-weight: 600;
      }
      .retailer-group { 
        margin: 20px 0; 
      }
      .retailer-header { 
        background-color: #e9ecef; 
        padding: 12px 20px; 
        border-radius: 8px; 
        margin-bottom: 15px; 
        font-weight: 600; 
        color: #495057; 
        font-size: 14px;
      }
      .details { 
        background-color: #f8f9fa; 
        border: 1px solid #dee2e6; 
        border-radius: 10px; 
        padding: 25px; 
        margin-top: 30px; 
      }
      .details h3 { 
        color: #495057; 
        margin-top: 0; 
        margin-bottom: 15px;
      }
      pre { 
        white-space: pre-wrap; 
        word-wrap: break-word; 
        background-color: white; 
        padding: 20px; 
        border-radius: 8px; 
        border: 1px solid #dee2e6; 
        font-size: 12px; 
        overflow-x: auto; 
        font-family: 'Courier New', monospace;
        line-height: 1.4;
        max-width: 100%;
      }
      .status-badge { 
        display: inline-block; 
        padding: 6px 16px; 
        border-radius: 25px; 
        font-size: 12px; 
        font-weight: 600; 
        text-transform: uppercase; 
        letter-spacing: 0.5px;
      }
      .status-success { 
        background-color: #d4edda; 
        color: #155724; 
      }
      .status-error { 
        background-color: #f8d7da; 
        color: #721c24; 
      }
      .retailers-list { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 10px; 
        margin-top: 15px; 
      }
      .retailer-tag { 
        background-color: #007bff; 
        color: white; 
        padding: 6px 12px; 
        border-radius: 15px; 
        font-size: 12px; 
        font-weight: 500;
      }
      .error-details { 
        background-color: #f8d7da; 
        border: 1px solid #f5c6cb; 
        border-radius: 10px; 
        padding: 25px; 
        margin: 25px 0; 
      }
      .context { 
        background-color: #f8f9fa; 
        border: 1px solid #dee2e6; 
        border-radius: 10px; 
        padding: 25px; 
        margin-top: 25px; 
      }
      .info-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
        gap: 20px; 
        margin: 25px 0; 
      }
      .info-item { 
        background-color: #f8f9fa; 
        padding: 20px; 
        border-radius: 10px; 
        border-left: 4px solid #007bff; 
      }
      .info-label { 
        font-size: 12px; 
        color: #6c757d; 
        text-transform: uppercase; 
        letter-spacing: 0.5px; 
        margin-bottom: 8px; 
        font-weight: 600;
      }
      .info-value { 
        font-weight: 600; 
        color: #495057; 
        font-size: 14px;
        word-wrap: break-word;
      }
      .footer {
        background-color: #f8f9fa;
        padding: 20px;
        text-align: center;
        color: #6c757d;
        font-size: 12px;
        border-top: 1px solid #dee2e6;
      }
      .footer a {
        color: #007bff;
        text-decoration: none;
      }
      .footer a:hover {
        text-decoration: underline;
      }
      .progress-bar {
        background-color: #e9ecef;
        border-radius: 10px;
        height: 8px;
        margin: 10px 0;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        border-radius: 10px;
        transition: width 0.3s ease;
      }
      .progress-success {
        background-color: #28a745;
      }
      .progress-error {
        background-color: #dc3545;
      }
      .progress-warning {
        background-color: #ffc107;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }
      .summary-item {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid #dee2e6;
      }
      .summary-number {
        font-size: 1.5em;
        font-weight: bold;
        color: #495057;
      }
      .summary-label {
        font-size: 12px;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 5px;
      }
      .debug-info {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
        font-size: 11px;
        color: #6c757d;
      }
      .debug-info pre {
        margin: 10px 0 0 0;
        padding: 10px;
        font-size: 10px;
      }
      @media (max-width: 600px) {
        .header-content {
          flex-direction: column;
          text-align: center;
        }
        .header-text {
          text-align: center;
        }
        .stats {
          grid-template-columns: 1fr;
        }
        .info-grid {
          grid-template-columns: 1fr;
        }
        .summary-grid {
          grid-template-columns: 1fr;
        }
        .content {
          padding: 20px;
        }
        .header {
          padding: 20px;
        }
        .header h1 {
          font-size: 24px;
        }
      }
    `;
  }

  generateFulfillmentTemplate(data) {
    const { fulfillments, timestamp } = data;
    const totalFulfillments = (fulfillments.success?.length || 0) + (fulfillments.errors?.length || 0);
    const successRate = totalFulfillments > 0 ? Math.round((fulfillments.success?.length || 0) / totalFulfillments * 100) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fulfillment Alert</title>
    <style>
        ${this.getBaseStyles()}
        .header { 
          background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); 
        }
        .stat-number { color: #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="${this.logoUrl}" alt="Live Good Logistics" class="logo">
                <div class="header-text">
                    <h1>📦 Fulfillment Processing Alert</h1>
                    <div class="subtitle">Automated fulfillment status update</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div style="margin-bottom: 25px;">
                <strong>Execution Time:</strong> ${new Date(timestamp).toLocaleString()}
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${fulfillments.success?.length || 0}</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${fulfillments.errors?.length || 0}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalFulfillments}</div>
                    <div class="stat-label">Total</div>
                </div>
            </div>
            
            ${totalFulfillments > 0 ? `
            <div style="margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Success Rate</span>
                    <span>${successRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-success" style="width: ${successRate}%;"></div>
                </div>
            </div>
            ` : ''}
            
            ${fulfillments.success?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #28a745;">✅ Successful Fulfillments</h3>
                ${fulfillments.success.map(item => `
                    <div class="success-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small>Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${fulfillments.errors?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #dc3545;">❌ Errors</h3>
                ${fulfillments.errors.map(item => `
                    <div class="error-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small>Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the Shopify Sync System</p>
            <p><a href="mailto:admin@livegoodlogistics.com">Contact Support</a> | <a href="https://livegoodlogistics.com">Live Good Logistics</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  generateOrderTemplate(data) {
    const { orders, timestamp } = data;
    const totalOrders = (orders.success?.length || 0) + (orders.errors?.length || 0);
    const successRate = totalOrders > 0 ? Math.round((orders.success?.length || 0) / totalOrders * 100) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Import Alert</title>
    <style>
        ${this.getBaseStyles()}
        .header { 
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
        }
        .stat-number { color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="${this.logoUrl}" alt="Live Good Logistics" class="logo">
                <div class="header-text">
                    <h1>🛒 Order Import Alert</h1>
                    <div class="subtitle">Automated order synchronization update</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div style="margin-bottom: 25px;">
                <strong>Execution Time:</strong> ${new Date(timestamp).toLocaleString()}
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${orders.success?.length || 0}</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${orders.errors?.length || 0}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalOrders}</div>
                    <div class="stat-label">Total</div>
                </div>
            </div>
            
            ${totalOrders > 0 ? `
            <div style="margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Success Rate</span>
                    <span>${successRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-success" style="width: ${successRate}%;"></div>
                </div>
            </div>
            ` : ''}
            
            ${orders.success?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #28a745;">✅ Successful Imports</h3>
                ${orders.success.map(item => `
                    <div class="success-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small>Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${orders.errors?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #dc3545;">❌ Errors</h3>
                ${orders.errors.map(item => `
                    <div class="error-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small>Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the Shopify Sync System</p>
            <p><a href="mailto:admin@livegoodlogistics.com">Contact Support</a> | <a href="https://livegoodlogistics.com">Live Good Logistics</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  generateInventoryTemplate(data) {
    const { inventory, timestamp } = data;
    const totalInventory = (inventory.success?.length || 0) + (inventory.errors?.length || 0);
    const successRate = totalInventory > 0 ? Math.round((inventory.success?.length || 0) / totalInventory * 100) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inventory Sync Alert</title>
    <style>
        ${this.getBaseStyles()}
        .header { 
          background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); 
        }
        .stat-number { color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="${this.logoUrl}" alt="Live Good Logistics" class="logo">
                <div class="header-text">
                    <h1>📦 Inventory Sync Alert</h1>
                    <div class="subtitle">Automated inventory synchronization update</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div style="margin-bottom: 25px;">
                <strong>Execution Time:</strong> ${new Date(timestamp).toLocaleString()}
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${inventory.success?.length || 0}</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${inventory.errors?.length || 0}</div>
                    <div class="stat-label">Errors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalInventory}</div>
                    <div class="stat-label">Total</div>
                </div>
            </div>
            
            ${totalInventory > 0 ? `
            <div style="margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Success Rate</span>
                    <span>${successRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-success" style="width: ${successRate}%;"></div>
                </div>
            </div>
            ` : ''}
            
            ${inventory.success?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #28a745;">✅ Successful Updates</h3>
                ${inventory.success.map(item => `
                    <div class="success-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small>Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${inventory.errors?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #dc3545;">❌ Errors</h3>
                ${inventory.errors.map(item => `
                    <div class="error-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small>Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the Shopify Sync System</p>
            <p><a href="mailto:admin@livegoodlogistics.com">Contact Support</a> | <a href="https://livegoodlogistics.com">Live Good Logistics</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  generateErrorTemplate(data) {
    const { error, context, timestamp } = data;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Error</title>
    <style>
        ${this.getBaseStyles()}
        .header { 
          background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="${this.logoUrl}" alt="Live Good Logistics" class="logo">
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
                <p style="margin: 0; font-weight: 500; font-size: 16px;">${error.message}</p>
            </div>
            
            ${error.stack ? `
            <div class="context">
                <h3 style="margin-top: 0; color: #495057;">Stack Trace</h3>
                <pre>${error.stack}</pre>
            </div>
            ` : ''}
            
            <div class="context">
                <h3 style="margin-top: 0; color: #495057;">Additional Context</h3>
                <pre>${JSON.stringify(context, null, 2)}</pre>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated error notification from the Shopify Sync System</p>
            <p><a href="mailto:admin@livegoodlogistics.com">Contact Support</a> | <a href="https://livegoodlogistics.com">Live Good Logistics</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  generateSummaryTemplate(data) {
    const { summary, timestamp, retailerSections } = data;
    
    // Calculate overall success rates
    const totalFulfillments = (summary.results?.fulfillments?.success || 0) + (summary.results?.fulfillments?.errors || 0);
    const totalOrders = (summary.results?.orders?.success || 0) + (summary.results?.orders?.errors || 0);
    const totalInventory = (summary.results?.inventory?.success || 0) + (summary.results?.inventory?.errors || 0);
    
    const fulfillmentRate = totalFulfillments > 0 ? Math.round((summary.results?.fulfillments?.success || 0) / totalFulfillments * 100) : 0;
    const orderRate = totalOrders > 0 ? Math.round((summary.results?.orders?.success || 0) / totalOrders * 100) : 0;
    const inventoryRate = totalInventory > 0 ? Math.round((summary.results?.inventory?.success || 0) / totalInventory * 100) : 0;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sync Summary</title>
    <style>
        ${this.getBaseStyles()}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="${this.logoUrl}" alt="Live Good Logistics" class="logo">
                <div class="header-text">
                    <h1>📊 Shopify Sync System Summary</h1>
                    <div class="subtitle">Automated synchronization report</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="overview" style="background-color: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                    <div>
                        <strong>Execution Time:</strong> ${new Date(timestamp).toLocaleString()}
                    </div>
                    <span class="status-badge status-${summary.status === 'success' ? 'success' : 'error'}">
                        ${summary.status.toUpperCase()}
                    </span>
                </div>
                <div style="color: #6c757d; font-size: 14px; margin-bottom: 10px;">
                    <strong>Duration:</strong> ${summary.duration ? Math.round(summary.duration / 1000) : 'N/A'} seconds
                </div>
                <div class="retailers-list">
                    <strong>Retailers:</strong>
                    ${summary.retailers?.map(r => `<span class="retailer-tag">${r}</span>`).join('') || 'None'}
                </div>
            </div>
            
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-number">${summary.results?.fulfillments?.total || 0}</div>
                    <div class="summary-label">Fulfillments</div>
                    ${totalFulfillments > 0 ? `<div style="margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                            <span>Success Rate</span>
                            <span>${fulfillmentRate}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill progress-success" style="width: ${fulfillmentRate}%;"></div>
                        </div>
                    </div>` : ''}
                </div>
                <div class="summary-item">
                    <div class="summary-number">${summary.results?.orders?.total || 0}</div>
                    <div class="summary-label">Orders</div>
                    ${totalOrders > 0 ? `<div style="margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                            <span>Success Rate</span>
                            <span>${orderRate}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill progress-success" style="width: ${orderRate}%;"></div>
                        </div>
                    </div>` : ''}
                </div>
                <div class="summary-item">
                    <div class="summary-number">${summary.results?.inventory?.total || 0}</div>
                    <div class="summary-label">SKUs Updated</div>
                    ${totalInventory > 0 ? `<div style="margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                            <span>Success Rate</span>
                            <span>${inventoryRate}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill progress-success" style="width: ${inventoryRate}%;"></div>
                        </div>
                    </div>` : ''}
                </div>
            </div>
            
            ${retailerSections}
            
            <div class="details">
                <h3>📋 Full Summary Details</h3>
                <pre>${JSON.stringify(summary, null, 2)}</pre>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the Shopify Sync System</p>
            <p><a href="mailto:admin@livegoodlogistics.com">Contact Support</a> | <a href="https://livegoodlogistics.com">Live Good Logistics</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
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
      const totalOperations = totalSuccess + totalErrors;
      const successRate = totalOperations > 0 ? Math.round(totalSuccess / totalOperations * 100) : 0;
      
      if (totalOperations === 0) return;
      
      sections += `
        <div class="section">
            <div class="section-header">
                <span class="section-icon">🏪</span>
                <h3 class="section-title">${retailer}</h3>
                <span class="section-count">${totalOperations}</span>
            </div>
            
            ${totalOperations > 0 ? `
            <div style="margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                    <span>Success Rate</span>
                    <span>${successRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-success" style="width: ${successRate}%;"></div>
                </div>
            </div>
            ` : ''}
            
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
}

module.exports = { EmailTemplates }; 