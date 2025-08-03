const fs = require('fs');
const path = require('path');

class EmailTemplates {
  constructor() {
    this.logoUrl = 'https://livegoodlogistics.com/cdn/shop/files/Live-Good-Word_Green_Final.png?v=1701960683&width=300';
  }

  getBaseStyles() {
    return `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
        margin: 0; 
        padding: 10px; 
        background-color: #f8f9fa; 
        line-height: 1.4;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        color: #333;
        font-size: 14px;
      }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background-color: white; 
        border-radius: 8px; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        overflow: hidden; 
      }
      .header { 
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
        color: white; 
        padding: 20px 15px; 
        text-align: center; 
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      .header-content { 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        gap: 15px; 
        flex-wrap: wrap;
      }
      .logo { 
        width: 180px; 
        height: auto; 
        border-radius: 6px;
        max-width: 100%;
      }
      .header-text { 
        text-align: left; 
        flex: 1;
        min-width: 150px;
      }
      .header h1 { 
        margin: 0; 
        font-size: 24px; 
        font-weight: 700; 
        word-wrap: break-word;
        line-height: 1.2;
        color: #198754;
        text-shadow: 0 1px 3px rgba(0,0,0,0.4);
      }
      .header .subtitle { 
        margin-top: 6px; 
        opacity: 0.95; 
        font-size: 14px; 
        font-weight: 400;
        color: #155724;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      .content { 
        padding: 20px 15px; 
      }
      .execution-time {
        background-color: #e3f2fd;
        border: 1px solid #2196f3;
        border-radius: 6px;
        padding: 12px 15px;
        margin-bottom: 15px;
        font-size: 13px;
        color: #1565c0;
        font-weight: 500;
      }
      .stats { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
        gap: 12px; 
        margin: 15px 0; 
      }
      .stat-card { 
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); 
        border: 1px solid #e9ecef; 
        border-radius: 8px; 
        padding: 15px 12px; 
        text-align: center; 
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      }
      .stat-number { 
        font-size: 2.2em; 
        font-weight: 800; 
        margin-bottom: 6px; 
        line-height: 1;
      }
      .stat-label { 
        color: #495057; 
        font-size: 12px; 
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .item { 
        padding: 12px 15px; 
        margin: 8px 0; 
        border-radius: 6px; 
        border-left: 4px solid; 
        font-size: 13px;
        word-wrap: break-word;
        line-height: 1.4;
      }
      .success-item { 
        background-color: #d4edda; 
        border-color: #28a745; 
        color: #155724; 
        font-weight: 500;
      }
      .error-item { 
        background-color: #f8d7da; 
        border-color: #dc3545; 
        color: #721c24; 
        font-weight: 500;
      }
      .warning-item { 
        background-color: #fff3cd; 
        border-color: #ffc107; 
        color: #856404; 
        font-weight: 500;
      }
      .section { 
        margin: 20px 0; 
      }
      .section-header { 
        display: flex; 
        align-items: center; 
        margin-bottom: 15px; 
        padding-bottom: 10px; 
        border-bottom: 2px solid #e9ecef; 
        flex-wrap: wrap;
      }
      .section-icon { 
        font-size: 20px; 
        margin-right: 10px; 
      }
      .section-title { 
        color: #2c3e50; 
        font-size: 18px; 
        font-weight: 700; 
        margin: 0; 
        flex: 1;
        min-width: 120px;
      }
      .section-count { 
        background-color: #007bff; 
        color: white; 
        padding: 4px 12px; 
        border-radius: 15px; 
        font-size: 11px; 
        margin-left: 10px; 
        font-weight: 700;
      }
      .retailer-group { 
        margin: 15px 0; 
      }
      .retailer-header { 
        background-color: #e9ecef; 
        padding: 10px 15px; 
        border-radius: 6px; 
        margin-bottom: 12px; 
        font-weight: 700; 
        color: #495057; 
        font-size: 13px;
      }
      .details { 
        background-color: #f8f9fa; 
        border: 1px solid #dee2e6; 
        border-radius: 8px; 
        padding: 15px; 
        margin-top: 20px; 
      }
      .details h3 { 
        color: #2c3e50; 
        margin-top: 0; 
        margin-bottom: 12px;
        font-size: 16px;
        font-weight: 700;
      }
      pre { 
        white-space: pre-wrap; 
        word-wrap: break-word; 
        background-color: white; 
        padding: 12px; 
        border-radius: 6px; 
        border: 1px solid #dee2e6; 
        font-size: 11px; 
        overflow-x: auto; 
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        line-height: 1.4;
        max-width: 100%;
        color: #2c3e50;
      }
      .status-badge { 
        display: inline-block; 
        padding: 6px 12px; 
        border-radius: 20px; 
        font-size: 11px; 
        font-weight: 700; 
        text-transform: uppercase; 
        letter-spacing: 0.3px;
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
        gap: 8px; 
        margin-top: 10px; 
      }
      .retailer-tag { 
        background-color: #007bff; 
        color: white; 
        padding: 6px 12px; 
        border-radius: 12px; 
        font-size: 11px; 
        font-weight: 600;
      }
      .error-details { 
        background-color: #f8d7da; 
        border: 1px solid #f5c6cb; 
        border-radius: 8px; 
        padding: 15px; 
        margin: 15px 0; 
      }
      .context { 
        background-color: #f8f9fa; 
        border: 1px solid #dee2e6; 
        border-radius: 8px; 
        padding: 15px; 
        margin-top: 15px; 
      }
      .info-grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
        gap: 12px; 
        margin: 15px 0; 
      }
      .info-item { 
        background-color: #f8f9fa; 
        padding: 12px; 
        border-radius: 8px; 
        border-left: 4px solid #007bff; 
      }
      .info-label { 
        font-size: 11px; 
        color: #6c757d; 
        text-transform: uppercase; 
        letter-spacing: 0.3px; 
        margin-bottom: 6px; 
        font-weight: 700;
      }
      .info-value { 
        font-weight: 700; 
        color: #2c3e50; 
        font-size: 13px;
        word-wrap: break-word;
      }
      .footer {
        background-color: #f8f9fa;
        padding: 15px;
        text-align: center;
        color: #6c757d;
        font-size: 11px;
        border-top: 1px solid #dee2e6;
      }
      .footer a {
        color: #007bff;
        text-decoration: none;
        font-weight: 600;
      }
      .footer a:hover {
        text-decoration: underline;
      }
      .progress-bar {
        background-color: #e9ecef;
        border-radius: 8px;
        height: 8px;
        margin: 8px 0;
        overflow: hidden;
        border: 1px solid #dee2e6;
      }
      .progress-fill {
        height: 100%;
        border-radius: 8px;
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
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin: 15px 0;
      }
      .summary-item {
        background-color: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid #dee2e6;
      }
      .summary-number {
        font-size: 1.6em;
        font-weight: 800;
        color: #2c3e50;
        line-height: 1;
      }
      .summary-label {
        font-size: 11px;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-top: 6px;
        font-weight: 600;
      }
      .debug-info {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 12px;
        margin: 12px 0;
        font-size: 11px;
        color: #6c757d;
      }
      .debug-info pre {
        margin: 8px 0 0 0;
        padding: 8px;
        font-size: 10px;
      }
      .action-buttons {
        margin: 20px 0;
        text-align: center;
      }
      .action-button {
        display: inline-block;
        padding: 10px 20px;
        margin: 0 8px;
        background-color: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 13px;
        transition: background-color 0.2s ease;
      }
      .action-button:hover {
        background-color: #0056b3;
      }
      .action-button.secondary {
        background-color: #6c757d;
      }
      .action-button.secondary:hover {
        background-color: #545b62;
      }
      .quick-stats {
        background-color: #e8f5e8;
        border: 1px solid #28a745;
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
      }
      .quick-stats h3 {
        margin: 0 0 12px 0;
        color: #155724;
        font-size: 14px;
        font-weight: 700;
      }
      .quick-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 10px;
      }
      .quick-stat {
        text-align: center;
        padding: 8px;
        background-color: white;
        border-radius: 6px;
        border: 1px solid #d4edda;
      }
      .quick-stat-number {
        font-size: 1.2em;
        font-weight: 800;
        color: #28a745;
        line-height: 1;
      }
      .quick-stat-label {
        font-size: 10px;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-top: 4px;
        font-weight: 600;
      }
      @media (max-width: 480px) {
        body {
          padding: 5px;
        }
        .container {
          border-radius: 6px;
        }
        .header {
          padding: 15px 10px;
        }
        .header h1 {
          font-size: 20px;
        }
        .header .subtitle {
          font-size: 12px;
        }
        .logo {
          width: 140px;
        }
        .content {
          padding: 15px 10px;
        }
        .stats {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .stat-card {
          padding: 12px 8px;
        }
        .stat-number {
          font-size: 1.8em;
        }
        .info-grid {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .summary-grid {
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .quick-stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .action-button {
          margin: 0;
          padding: 12px 16px;
        }
        .item {
          padding: 10px 12px;
          font-size: 12px;
        }
        .section-title {
          font-size: 16px;
        }
        .execution-time {
          padding: 10px 12px;
          font-size: 12px;
        }
      }
    `;
  }

  generateFulfillmentTemplate(data) {
    const { fulfillments, timestamp } = data;
    const totalFulfillments = (fulfillments.success?.length || 0) + (fulfillments.errors?.length || 0);
    const successRate = totalFulfillments > 0 ? Math.round((fulfillments.success?.length || 0) / totalFulfillments * 100) : 0;
    
    // Get unique retailers for better organization
    const retailers = [...new Set([
      ...(fulfillments.success?.map(item => item.retailer) || []),
      ...(fulfillments.errors?.map(item => item.retailer) || [])
    ])];
    
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
                    <h1>Fulfillment Processing Alert</h1>
                    <div class="subtitle">${totalFulfillments > 0 ? `${totalFulfillments} fulfillment(s) processed` : 'No fulfillments to process'}</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="execution-time">
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
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 600;">
                    <span>Success Rate</span>
                    <span>${successRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-success" style="width: ${successRate}%;"></div>
                </div>
            </div>
            ` : ''}
            
            ${retailers.length > 0 ? `
            <div class="quick-stats">
                <h3>Retailers Processed</h3>
                <div class="quick-stats-grid">
                    ${retailers.map(retailer => {
                        const successCount = fulfillments.success?.filter(item => item.retailer === retailer).length || 0;
                        const errorCount = fulfillments.errors?.filter(item => item.retailer === retailer).length || 0;
                        const total = successCount + errorCount;
                        const rate = total > 0 ? Math.round(successCount / total * 100) : 0;
                        return `
                        <div class="quick-stat">
                            <div class="quick-stat-number">${total}</div>
                            <div class="quick-stat-label">${retailer}</div>
                            <div style="font-size: 11px; color: #6c757d; margin-top: 5px;">
                                ${rate}% success
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : ''}
            
            ${fulfillments.success?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #28a745;">Successful Fulfillments (${fulfillments.success.length})</h3>
                ${fulfillments.success.map(item => `
                    <div class="success-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small style="opacity: 0.8;">Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${fulfillments.errors?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #dc3545;">Errors (${fulfillments.errors.length})</h3>
                ${fulfillments.errors.map(item => `
                    <div class="error-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small style="opacity: 0.8;">Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="action-buttons">
                <a href="mailto:admin@livegoodlogistics.com?subject=Fulfillment%20Alert%20Follow-up" class="action-button">Contact Support</a>
                <a href="https://livegoodlogistics.com" class="action-button secondary">Visit Website</a>
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

  generateOrderTemplate(data) {
    const { orders, timestamp } = data;
    const totalOrders = (orders.success?.length || 0) + (orders.errors?.length || 0);
    const successRate = totalOrders > 0 ? Math.round((orders.success?.length || 0) / totalOrders * 100) : 0;
    
    // Get unique retailers for better organization
    const retailers = [...new Set([
      ...(orders.success?.map(item => item.retailer) || []),
      ...(orders.errors?.map(item => item.retailer) || [])
    ])];
    
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
                    <h1>Order Import Alert</h1>
                    <div class="subtitle">${totalOrders > 0 ? `${totalOrders} order(s) processed` : 'No orders to import'}</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="execution-time">
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
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 600;">
                    <span>Success Rate</span>
                    <span>${successRate}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill progress-success" style="width: ${successRate}%;"></div>
                </div>
            </div>
            ` : ''}
            
            ${retailers.length > 0 ? `
            <div class="quick-stats">
                <h3>Retailers Processed</h3>
                <div class="quick-stats-grid">
                    ${retailers.map(retailer => {
                        const successCount = orders.success?.filter(item => item.retailer === retailer).length || 0;
                        const errorCount = orders.errors?.filter(item => item.retailer === retailer).length || 0;
                        const total = successCount + errorCount;
                        const rate = total > 0 ? Math.round(successCount / total * 100) : 0;
                        return `
                        <div class="quick-stat">
                            <div class="quick-stat-number">${total}</div>
                            <div class="quick-stat-label">${retailer}</div>
                            <div style="font-size: 11px; color: #6c757d; margin-top: 5px;">
                                ${rate}% success
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            ` : ''}
            
            ${orders.success?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #28a745;">Successful Imports (${orders.success.length})</h3>
                ${orders.success.map(item => `
                    <div class="success-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small style="opacity: 0.8;">Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${orders.errors?.length > 0 ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #dc3545;">Errors (${orders.errors.length})</h3>
                ${orders.errors.map(item => `
                    <div class="error-item">
                        <strong>${item.retailer}:</strong> ${item.message}
                        ${item.response ? `<br><small style="opacity: 0.8;">Response: ${JSON.stringify(item.response, null, 2)}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="action-buttons">
                <a href="mailto:admin@livegoodlogistics.com?subject=Order%20Import%20Alert%20Follow-up" class="action-button">Contact Support</a>
                <a href="https://livegoodlogistics.com" class="action-button secondary">Visit Website</a>
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

  generateInventoryTemplate(data) {
    const { inventory, timestamp } = data;
    
    // Extract the new data structure
    const successfulUpdates = inventory.successfulUpdates || 0;
    const locationMismatches = inventory.locationMismatches || 0;
    const failures = inventory.failures || 0;
    const total = inventory.total || 0;
    
    const successRate = total > 0 ? Math.round((successfulUpdates / total) * 100) : 0;
    
    // Get unique retailers for better organization
    const retailers = [...new Set([
      ...(inventory.details?.successfulUpdates?.map(item => item.retailer) || []),
      ...(inventory.details?.locationMismatches?.map(item => item.retailer) || []),
      ...(inventory.details?.failures?.map(item => item.retailer) || [])
    ])];
    
    // Group by retailer for cleaner display
    const retailerSummaries = retailers.map(retailer => {
      // Use the actual counts from the inventory object, not the details arrays
      const successCount = inventory.successfulUpdates || 0;
      const mismatchCount = inventory.locationMismatches || 0;
      const failureCount = inventory.failures || 0;
      const retailerTotal = successCount + mismatchCount + failureCount;
      const retailerSuccessRate = retailerTotal > 0 ? Math.round((successCount / retailerTotal) * 100) : 0;
      
      return {
        name: retailer,
        successCount,
        mismatchCount,
        failureCount,
        total: retailerTotal,
        successRate: retailerSuccessRate
      };
    });
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px; text-align: center;">
            Live Good Logistics - Inventory Sync Alert
          </h1>
          
          <div style="background-color: #ecf0f1; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #34495e; margin: 0 0 15px 0; font-size: 18px;">📊 Summary</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
              <div style="text-align: center; padding: 10px; background-color: #d5f4e6; border-radius: 4px;">
                <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${successfulUpdates}</div>
                <div style="font-size: 12px; color: #7f8c8d;">Successful Updates</div>
              </div>
              <div style="text-align: center; padding: 10px; background-color: #fdf2e9; border-radius: 4px;">
                <div style="font-size: 24px; font-weight: bold; color: #e67e22;">${locationMismatches}</div>
                <div style="font-size: 12px; color: #7f8c8d;">Location Mismatches</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="text-align: center; padding: 10px; background-color: #fadbd8; border-radius: 4px;">
                <div style="font-size: 24px; font-weight: bold; color: #e74c3c;">${failures}</div>
                <div style="font-size: 12px; color: #7f8c8d;">Failures</div>
              </div>
              <div style="text-align: center; padding: 10px; background-color: #ebf3fd; border-radius: 4px;">
                <div style="font-size: 24px; font-weight: bold; color: #3498db;">${successRate}%</div>
                <div style="font-size: 12px; color: #7f8c8d;">Success Rate</div>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #34495e; margin: 0 0 15px 0; font-size: 16px;">🏪 Retailers Processed</h3>
            ${retailerSummaries.map(retailer => `
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
                <div style="font-weight: bold; color: #2c3e50; margin-bottom: 8px;">${retailer.name}</div>
                <div style="font-size: 14px; color: #7f8c8d;">
                  ${retailer.successCount} successful, ${retailer.mismatchCount} location mismatches, ${retailer.failureCount} failures
                  <span style="color: ${retailer.successRate >= 90 ? '#27ae60' : retailer.successRate >= 70 ? '#f39c12' : '#e74c3c'}; font-weight: bold;">
                    (${retailer.successRate}% success rate)
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
          
          ${successfulUpdates > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #27ae60; margin: 0 0 15px 0; font-size: 16px;">✅ Successful Updates</h3>
              <div style="background-color: #d5f4e6; padding: 15px; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #27ae60; font-weight: bold;">
                  ${successfulUpdates} SKU(s) successfully updated with new inventory levels.
                </p>
                <p style="margin: 0; font-size: 14px; color: #7f8c8d;">
                  These SKUs were successfully synchronized from the source store to the target store.
                </p>
              </div>
            </div>
          ` : ''}
          
          ${locationMismatches > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #e67e22; margin: 0 0 15px 0; font-size: 16px;">⚠️ Location Mismatches</h3>
              <div style="background-color: #fdf2e9; padding: 15px; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #d35400; font-weight: bold;">
                  ${locationMismatches} SKU(s) failed due to location mapping issues.
                </p>
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #7f8c8d;">
                  These SKUs exist in both stores but the inventory location mapping is incorrect. 
                  The SKU is valid but the location assignment needs to be updated.
                </p>
                <div style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px;">
                  <p style="margin: 0; font-size: 13px; color: #856404;">
                    <strong>Action Required:</strong> Review and update location mappings for these SKUs to enable successful inventory sync.
                  </p>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${failures > 0 ? `
            <div style="margin-bottom: 25px;">
              <h3 style="color: #e74c3c; margin: 0 0 15px 0; font-size: 16px;">❌ Failures</h3>
              <div style="background-color: #fadbd8; padding: 15px; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #c0392b; font-weight: bold;">
                  ${failures} SKU(s) failed to sync properly.
                </p>
                <p style="margin: 0; font-size: 14px; color: #7f8c8d;">
                  Common causes: SKU not found in one of the stores, inventory level issues, or API errors.
                  Check the logs for detailed error information.
                </p>
              </div>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 25px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
            <p style="margin: 0; font-size: 12px; color: #95a5a6;">
              ⏱️ Execution Time: ${timestamp}<br>
              Total SKUs Processed: ${total}
            </p>
          </div>
        </div>
      </div>
    `;
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
        .stat-number { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <img src="${this.logoUrl}" alt="Live Good Logistics" class="logo">
                <div class="header-text">
                    <h1>System Error Alert</h1>
                    <div class="subtitle">Critical error detected in ${context.operation || 'system'}</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="execution-time">
                <strong>Error Time:</strong> ${new Date(timestamp).toLocaleString()}
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${context.retailer || 'Unknown'}</div>
                    <div class="stat-label">Retailer</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${context.operation || 'Unknown'}</div>
                    <div class="stat-label">Operation</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">Error</div>
                    <div class="stat-label">Status</div>
                </div>
            </div>
            
            <div class="error-details">
                <h3 style="margin-top: 0; color: #721c24;">Error Details</h3>
                <div class="error-item">
                    <strong>Message:</strong> ${error.message}
                </div>
            </div>
            
            ${error.stack ? `
            <div class="section">
                <h3 style="margin-top: 0; color: #495057;">Stack Trace</h3>
                <div class="context">
                    <pre>${error.stack}</pre>
                </div>
            </div>
            ` : ''}
            
            <div class="section">
                <h3 style="margin-top: 0; color: #495057;">Additional Context</h3>
                <div class="context">
                    <pre>${JSON.stringify(context, null, 2)}</pre>
                </div>
            </div>
            
            <div class="action-buttons">
                <a href="mailto:admin@livegoodlogistics.com?subject=System%20Error%20Follow-up" class="action-button">Contact Support</a>
                <a href="https://livegoodlogistics.com" class="action-button secondary">Visit Website</a>
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
                    <h1>Shopify Sync System Summary</h1>
                    <div class="subtitle">${summary.status === 'success' ? 'All operations completed' : 'Some operations failed'}</div>
                </div>
            </div>
        </div>
        
        <div class="content">
            <div class="execution-time">
                <strong>Execution Time:</strong> ${new Date(timestamp).toLocaleString()}
            </div>
            <div class="quick-stats">
                <h3>Quick Stats</h3>
                <div class="quick-stats-grid">
                    <div class="quick-stat">
                        <div class="quick-stat-number">${summary.results?.fulfillments?.total || 0}</div>
                        <div class="quick-stat-label">Fulfillments</div>
                        ${totalFulfillments > 0 ? `<div style="font-size: 11px; color: #6c757d; margin-top: 5px;">${fulfillmentRate}% success</div>` : ''}
                    </div>
                    <div class="quick-stat">
                        <div class="quick-stat-number">${summary.results?.orders?.total || 0}</div>
                        <div class="quick-stat-label">Orders</div>
                        ${totalOrders > 0 ? `<div style="font-size: 11px; color: #6c757d; margin-top: 5px;">${orderRate}% success</div>` : ''}
                    </div>
                    <div class="quick-stat">
                        <div class="quick-stat-number">${summary.results?.inventory?.total || 0}</div>
                        <div class="quick-stat-label">SKUs Updated</div>
                        ${totalInventory > 0 ? `<div style="font-size: 11px; color: #6c757d; margin-top: 5px;">${inventoryRate}% success</div>` : ''}
                    </div>
                </div>
            </div>
            
            <div style="background-color: #f8f9fa; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                    <div>
                        <strong>Duration:</strong> ${summary.duration ? Math.round(summary.duration / 1000) : 'N/A'} seconds
                    </div>
                    <span class="status-badge status-${summary.status === 'success' ? 'success' : 'error'}">
                        ${summary.status.toUpperCase()}
                    </span>
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
                <h3>Full Summary Details</h3>
                <pre>${JSON.stringify(summary, null, 2)}</pre>
            </div>
            
            <div class="action-buttons">
                <a href="mailto:admin@livegoodlogistics.com?subject=Sync%20Summary%20Follow-up" class="action-button">Contact Support</a>
                <a href="https://livegoodlogistics.com" class="action-button secondary">Visit Website</a>
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
                <div class="retailer-header">Successful Operations (${totalSuccess})</div>
                ${data.success.map(item => `
                    <div class="success-item">
                        <strong>${item.type.toUpperCase()}:</strong> ${item.message}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${totalErrors > 0 ? `
            <div class="retailer-group">
                <div class="retailer-header">Errors (${totalErrors})</div>
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