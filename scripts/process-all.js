const fs = require('fs');
const path = require('path');
const { OrderProcessor } = require('./utils/order-processor');
const { FulfillmentProcessor } = require('./utils/fulfillment-processor');
const { InventoryProcessor } = require('./utils/inventory-processor');
const { EmailNotifier } = require('./utils/email-notifier');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../config/global-config.json'), 'utf8'));
}

function loadRetailers() {
  const retailersDir = path.join(__dirname, '../config/retailers');
  const files = fs.readdirSync(retailersDir).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const retailer = JSON.parse(fs.readFileSync(path.join(retailersDir, file), 'utf8'));
    retailer.id = file.replace('.json', '');
    return retailer;
  });
}

async function processOrders(retailers, config) {
  console.log('=== Processing Order Imports ===');
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.importOrders) {
      console.log(`Skipping ${retailer.name}: disabled or import disabled`);
      continue;
    }
    try {
      const processor = new OrderProcessor(retailer, config);
      await processor.processOrders();
    } catch (error) {
      console.error(`Failed to process orders for ${retailer.name}:`, error);
    }
  }
}

async function processFulfillments(retailers, config) {
  console.log('=== Processing Fulfillment Pushbacks ===');
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.pushFulfillments) {
      console.log(`Skipping ${retailer.name}: disabled or fulfillment pushback disabled`);
      continue;
    }
    try {
      const processor = new FulfillmentProcessor(retailer, config);
      await processor.processFulfillments();
    } catch (error) {
      console.error(`Failed to process fulfillments for ${retailer.name}:`, error);
    }
  }
}

async function processInventorySync(retailers, config) {
  console.log('=== Processing Inventory Sync ===');
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.syncInventory) {
      console.log(`Skipping ${retailer.name}: disabled or inventory sync disabled`);
      continue;
    }
    try {
      const processor = new InventoryProcessor(retailer, config);
      await processor.processInventorySync();
    } catch (error) {
      console.error(`Failed to process inventory sync for ${retailer.name}:`, error);
    }
  }
}

async function main() {
  const operation = process.argv[2] || 'all'; // 'orders', 'fulfillments', 'inventory', or 'all'
  const retailerId = process.env.RETAILER_ID;
  
  const config = loadConfig();
  let retailers = loadRetailers();
  const emailNotifier = new EmailNotifier(config);
  
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
        await processOrders(retailers, config);
        break;
      case 'fulfillments':
        await processFulfillments(retailers, config);
        break;
      case 'inventory':
        await processInventorySync(retailers, config);
        break;
      case 'all':
        await processFulfillments(retailers, config);
        await processOrders(retailers, config);
        await processInventorySync(retailers, config);
        break;
      default:
        console.error('Invalid operation. Use: orders, fulfillments, inventory, or all');
        process.exit(1);
    }
    
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'success';
    
    console.log('Processing completed successfully');
    
    // Send summary notification if enabled
    if (config.emailNotifications?.sendSummaries) {
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