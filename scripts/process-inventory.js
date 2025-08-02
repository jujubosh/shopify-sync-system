const fs = require('fs');
const path = require('path');
const { InventoryProcessor } = require('./utils/inventory-processor');
const { DatabaseEmailNotifier } = require('./utils/database-email-notifier');

function loadConfig() {
  // Check if we're in test mode
  const configFile = process.env.TEST_CONFIG 
    ? path.join(__dirname, '../config/global-config-test.json')
    : path.join(__dirname, '../config/global-config.json');
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
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

async function processInventorySync(retailers, config) {
  console.log('=== Processing Inventory Sync ===');
  const results = { total: 0, success: [], errors: [] };
  
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.syncInventory) {
      console.log(`Skipping ${retailer.name}: disabled or inventory sync disabled`);
      continue;
    }
    try {
      const processor = new InventoryProcessor(retailer, config);
      const inventoryResult = await processor.processInventorySync();
      results.total += inventoryResult?.total || 0;
      if (inventoryResult?.success && inventoryResult.success.length > 0) {
        results.success.push({ retailer: retailer.name, message: inventoryResult.success });
      }
    } catch (error) {
      console.error(`Failed to process inventory sync for ${retailer.name}:`, error);
      results.errors.push({ retailer: retailer.name, message: error.message });
    }
  }
  
  return results;
}

async function main() {
  const retailerId = process.env.RETAILER_ID;
  
  const config = loadConfig();
  let retailers = loadRetailers();
  const emailNotifier = new DatabaseEmailNotifier(config);
  
  if (retailerId) {
    retailers = retailers.filter(r => r.id === retailerId);
    if (retailers.length === 0) {
      console.error(`Retailer with ID '${retailerId}' not found`);
      process.exit(1);
    }
  }
  
  console.log(`Processing inventory sync for ${retailers.length} retailer(s)`);
  
  const startTime = new Date();
  const summary = {
    operation: 'inventory',
    startTime: startTime.toISOString(),
    retailers: retailers.map(r => r.name),
    results: {}
  };
  
  try {
    summary.results.inventory = await processInventorySync(retailers, config);
    
    // Send inventory-specific alert
    await emailNotifier.sendInventoryAlert(summary.results);
    
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'success';
    
    console.log('Inventory sync completed successfully');
    
  } catch (error) {
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'error';
    summary.error = error.message;
    
    console.error('Fatal error:', error);
    
    // Send error notification
    await emailNotifier.sendErrorNotification(error, {
      operation: 'inventory',
      retailers: retailers.map(r => r.name)
    });
    
    process.exit(1);
  }
}

main(); 