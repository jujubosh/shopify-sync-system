const fs = require('fs');
const path = require('path');
const { OrderProcessor } = require('./utils/order-processor');
const { FulfillmentProcessor } = require('./utils/fulfillment-processor');
const { DatabaseEmailNotifier } = require('./utils/database-email-notifier');

function loadConfig() {
  // Check if we're in test mode
  const configFile = process.env.TEST_CONFIG 
    ? path.join(__dirname, '../config/global-config-test.json')
    : path.join(__dirname, '../config/global-config.json');
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

async function loadRetailers() {
  const { RetailerService } = require('./utils/retailer-service');
  const retailerService = new RetailerService();
  return await retailerService.loadRetailers();
}

async function processOrders(retailers, config) {
  console.log('=== Processing Order Imports ===');
  const results = { total: 0, success: [], errors: [] };
  
  for (const retailer of retailers) {
    // Workflow already validated that retailer is enabled and importOrders is enabled
    try {
      const processor = new OrderProcessor(retailer, config);
      const orderResult = await processor.processOrders();
      results.total += orderResult?.total || 0;
      if (orderResult?.success && orderResult.success.length > 0) {
        results.success.push({ retailer: retailer.name, message: orderResult.success });
      }
    } catch (error) {
      console.error(`Failed to process orders for ${retailer.name}:`, error);
      results.errors.push({ retailer: retailer.name, message: error.message });
    }
  }
  
  return results;
}

async function processFulfillments(retailers, config) {
  console.log('=== Processing Fulfillment Pushbacks ===');
  const results = { total: 0, success: [], errors: [] };
  
  for (const retailer of retailers) {
    // Workflow already validated that retailer is enabled and pushFulfillments is enabled
    try {
      const processor = new FulfillmentProcessor(retailer, config);
      const fulfillmentResult = await processor.processFulfillments();
      results.total += fulfillmentResult?.total || 0;
      if (fulfillmentResult?.success && fulfillmentResult.success.length > 0) {
        results.success.push({ retailer: retailer.name, message: fulfillmentResult.success });
      }
    } catch (error) {
      console.error(`Failed to process fulfillments for ${retailer.name}:`, error);
      results.errors.push({ retailer: retailer.name, message: error.message });
    }
  }
  
  return results;
}

async function main() {
  const operation = process.argv[2] || 'all'; // 'orders', 'fulfillments', or 'all'
  const retailerId = process.env.RETAILER_ID;
  
  const config = loadConfig();
  let retailers = await loadRetailers();
  const emailNotifier = new DatabaseEmailNotifier(config);
  
  if (retailerId) {
    retailers = retailers.filter(r => r.id === retailerId);
    if (retailers.length === 0) {
      console.error(`Retailer with ID '${retailerId}' not found`);
      process.exit(1);
    }
  }
  
  console.log(`Processing ${operation} for ${retailers.length} retailer(s)`);
  
  const startTime = new Date();
  const summary = {
    operation,
    startTime: startTime.toISOString(),
    retailers: retailers.map(r => r.name),
    results: {}
  };
  
  try {
    switch (operation) {
      case 'orders':
        summary.results.orders = await processOrders(retailers, config);
        // Send order-specific alert
        await emailNotifier.sendOrderAlert(summary.results);
        break;
      case 'fulfillments':
        summary.results.fulfillments = await processFulfillments(retailers, config);
        // Send fulfillment-specific alert
        await emailNotifier.sendFulfillmentAlert(summary.results);
        break;
      case 'all':
        summary.results.fulfillments = await processFulfillments(retailers, config);
        summary.results.orders = await processOrders(retailers, config);
        
        // Debug logging to see the exact structure
        console.log('DEBUG: Orders results structure:', JSON.stringify(summary.results.orders, null, 2));
        console.log('DEBUG: Orders total:', summary.results.orders.total);
        console.log('DEBUG: Orders success length:', summary.results.orders.success?.length);
        console.log('DEBUG: Orders errors length:', summary.results.orders.errors?.length);
        
        // Send individual alerts for each operation
        await emailNotifier.sendFulfillmentAlert(summary.results);
        await emailNotifier.sendOrderAlert(summary.results);
        break;
      default:
        console.error('Invalid operation. Use: orders, fulfillments, or all');
        process.exit(1);
    }
    
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'success';
    
    console.log('Processing completed successfully');
    
    // Send summary notification if enabled (only for 'all' operation)
    if (operation === 'all' && config.emailNotifications?.sendSummaries) {
      await emailNotifier.sendSummaryNotification(summary);
    }
    
  } catch (error) {
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'error';
    summary.error = error.message;
    
    console.error('Fatal error:', error);
    
    // Send error notification
    await emailNotifier.sendErrorNotification(error, {
      operation,
      retailers: retailers.map(r => r.name)
    });
    
    process.exit(1);
  }
}

main(); 