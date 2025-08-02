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
  console.log('Starting inventory sync...');
  const results = { 
    total: 0, 
    successfulUpdates: 0,
    locationMismatches: 0,
    failures: 0,
    details: {
      successfulUpdates: [],
      locationMismatches: [],
      failures: []
    }
  };
  
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.syncInventory) {
      console.log(`Skipping ${retailer.name} (disabled)`);
      continue;
    }
    
    try {
      console.log(`Processing ${retailer.name}...`);
      const processor = new InventoryProcessor(retailer, config);
      const inventoryResult = await processor.processInventorySync();
      
      // Aggregate results from this retailer
      results.total += inventoryResult?.total || 0;
      results.successfulUpdates += inventoryResult?.successfulUpdates || 0;
      results.locationMismatches += inventoryResult?.locationMismatches || 0;
      results.failures += inventoryResult?.failures || 0;
      
      // Add retailer-specific details
      if (inventoryResult?.details?.successfulUpdates) {
        inventoryResult.details.successfulUpdates.forEach(sku => {
          results.details.successfulUpdates.push({ retailer: retailer.name, sku });
        });
      }
      
      if (inventoryResult?.details?.locationMismatches) {
        inventoryResult.details.locationMismatches.forEach(mismatch => {
          results.details.locationMismatches.push({ 
            retailer: retailer.name, 
            sku: mismatch.sku,
            expectedLocation: mismatch.expectedLocation,
            actualLocation: mismatch.actualLocation
          });
        });
      }
      
      if (inventoryResult?.details?.failures) {
        inventoryResult.details.failures.forEach(failure => {
          results.details.failures.push({ 
            retailer: retailer.name, 
            sku: failure.sku,
            error: failure.error
          });
        });
      }
    } catch (error) {
      console.error(`Error processing ${retailer.name}: ${error.message}`);
      results.failures++;
      results.details.failures.push({ 
        retailer: retailer.name, 
        sku: 'N/A',
        error: error.message 
      });
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
      console.error(`Retailer '${retailerId}' not found`);
      process.exit(1);
    }
  }
  
  console.log(`Processing ${retailers.length} retailer(s)`);
  
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
    
    console.log('Inventory sync completed');
    
  } catch (error) {
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'error';
    summary.error = error.message;
    
    console.error('Fatal error:', error.message);
    
    // Send error notification
    await emailNotifier.sendErrorNotification(error, {
      operation: 'inventory',
      retailers: retailers.map(r => r.name)
    });
    
    process.exit(1);
  }
}

main(); 