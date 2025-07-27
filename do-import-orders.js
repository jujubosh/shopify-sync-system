const { OrderProcessor } = require('./scripts/utils/order-processor');
const { FulfillmentProcessor } = require('./scripts/utils/fulfillment-processor');
const { InventoryProcessor } = require('./scripts/utils/inventory-processor');
const fs = require('fs');
const path = require('path');

function loadConfig() {
  return JSON.parse(fs.readFileSync('./config/global-config.json', 'utf8'));
}

function loadRetailers() {
  const retailersDir = './config/retailers';
  const files = fs.readdirSync(retailersDir).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const retailer = JSON.parse(fs.readFileSync(path.join(retailersDir, file), 'utf8'));
    retailer.id = file.replace('.json', '');
    return retailer;
  });
}

async function processOrders(retailers, config) {
  console.log('=== Processing Order Imports ===');
  const results = [];
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.importOrders) {
      console.log(`Skipping ${retailer.name}: disabled or import disabled`);
      results.push({ retailer: retailer.id, operation: 'import', status: 'skipped', reason: 'disabled' });
      continue;
    }
    try {
      const processor = new OrderProcessor(retailer, config);
      await processor.processOrders();
      results.push({ retailer: retailer.id, operation: 'import', status: 'success' });
    } catch (error) {
      console.error(`Failed to process orders for ${retailer.name}:`, error);
      results.push({ retailer: retailer.id, operation: 'import', status: 'error', error: error.message });
    }
  }
  return results;
}

async function processFulfillments(retailers, config) {
  console.log('=== Processing Fulfillment Pushbacks ===');
  const results = [];
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.pushFulfillments) {
      console.log(`Skipping ${retailer.name}: disabled or fulfillment pushback disabled`);
      results.push({ retailer: retailer.id, operation: 'fulfillment', status: 'skipped', reason: 'disabled' });
      continue;
    }
    try {
      const processor = new FulfillmentProcessor(retailer, config);
      await processor.processFulfillments();
      results.push({ retailer: retailer.id, operation: 'fulfillment', status: 'success' });
    } catch (error) {
      console.error(`Failed to process fulfillments for ${retailer.name}:`, error);
      results.push({ retailer: retailer.id, operation: 'fulfillment', status: 'error', error: error.message });
    }
  }
  return results;
}

async function processInventorySync(retailers, config) {
  console.log('=== Processing Inventory Sync ===');
  const results = [];
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.syncInventory) {
      console.log(`Skipping ${retailer.name}: disabled or inventory sync disabled`);
      results.push({ retailer: retailer.id, operation: 'inventory', status: 'skipped', reason: 'disabled' });
      continue;
    }
    try {
      const processor = new InventoryProcessor(retailer, config);
      const inventoryResults = await processor.processInventorySync();
      results.push({ 
        retailer: retailer.id, 
        operation: 'inventory', 
        status: 'success',
        details: inventoryResults
      });
    } catch (error) {
      console.error(`Failed to process inventory sync for ${retailer.name}:`, error);
      results.push({ retailer: retailer.id, operation: 'inventory', status: 'error', error: error.message });
    }
  }
  return results;
}

// DigitalOcean Function handler
module.exports.main = async function main(args) {
  const operation = args.operation || args.op || 'all'; // 'orders', 'fulfillments', 'inventory', or 'all'
  const retailerId = args.retailerId || args.retailer;
  
  const config = loadConfig();
  let retailers = loadRetailers();
  
  if (retailerId) {
    retailers = retailers.filter(r => r.id === retailerId);
    if (retailers.length === 0) {
      return { 
        error: `Retailer with ID '${retailerId}' not found`,
        availableRetailers: loadRetailers().map(r => r.id)
      };
    }
  }
  
  console.log(`Processing ${operation} for ${retailers.length} retailer(s)`);
  
  try {
    let results = [];
    
    switch (operation) {
      case 'orders':
        results = await processOrders(retailers, config);
        break;
      case 'fulfillments':
        results = await processFulfillments(retailers, config);
        break;
      case 'inventory':
        results = await processInventorySync(retailers, config);
        break;
      case 'all':
        const orderResults = await processOrders(retailers, config);
        const fulfillmentResults = await processFulfillments(retailers, config);
        const inventoryResults = await processInventorySync(retailers, config);
        results = [...orderResults, ...fulfillmentResults, ...inventoryResults];
        break;
      default:
        return { 
          error: 'Invalid operation. Use: orders, fulfillments, inventory, or all',
          availableOperations: ['orders', 'fulfillments', 'inventory', 'all']
        };
    }
    
    return { 
      success: true,
      operation,
      retailersProcessed: retailers.length,
      results
    };
    
  } catch (error) {
    console.error('Fatal error:', error);
    return { 
      error: error.message,
      operation,
      retailersProcessed: retailers.length
    };
  }
}; 