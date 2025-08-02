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
  const results = { total: 0, success: [], errors: [], audit: { wrongLocation: [] }, checked: [] };
  
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.syncInventory) {
      console.log(`Skipping ${retailer.name}: disabled or inventory sync disabled`);
      continue;
    }
    try {
      const processor = new InventoryProcessor(retailer, config);
      // Use the new bulk sync method for better efficiency
      const inventoryResult = await processor.processBulkInventorySync();
      results.total += inventoryResult?.total || 0;
      
      // Convert success messages to the expected format
      if (inventoryResult?.success && inventoryResult.success.length > 0) {
        results.success.push({ 
          retailer: retailer.name, 
          message: inventoryResult.success.join(', ') 
        });
      }
      
      // Convert error messages to the expected format
      if (inventoryResult?.errors && inventoryResult.errors.length > 0) {
        results.errors.push({ 
          retailer: retailer.name, 
          message: inventoryResult.errors.join(', ') 
        });
      }
      
      // Include audit data for SKUs in wrong location
      if (inventoryResult?.audit?.wrongLocation && inventoryResult.audit.wrongLocation.length > 0) {
        results.audit.wrongLocation.push(...inventoryResult.audit.wrongLocation.map(item => ({
          ...item,
          retailer: retailer.name
        })));
      }
      
      // Include checked SKUs (those that were processed but didn't need updates)
      if (inventoryResult?.checked && inventoryResult.checked.length > 0) {
        results.checked.push(...inventoryResult.checked.map(item => ({
          ...item,
          retailer: retailer.name
        })));
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