const fs = require('fs');
const path = require('path');
const { InventoryProcessor } = require('./utils/inventory-processor');
const { DatabaseEmailNotifier } = require('./utils/database-email-notifier');

function loadConfig() {
  // Use test config for testing
  const configFile = path.join(__dirname, '../config/global-config-test.json');
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

async function testInventorySync(retailers, config) {
  console.log('=== Testing Inventory Sync with 5 Test SKUs ===');
  
  // Test SKUs including the requested one
  const testSkus = [
    'EDB-OLI-ARB-NA-3G',  // Requested SKU
    'EDB-PEA-CON-45-5G',  // Common SKU
    'ANN-BUL-CRM-NA-15-HBF', // Another common SKU
    'FLT-MAG-TED-45-7G',  // Different category
    'FLO-RED-FLA-45-7G'   // Another category
  ];
  
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
      console.log(`Skipping ${retailer.name}: disabled or inventory sync disabled`);
      continue;
    }
    
    try {
      console.log(`\n--- Testing ${retailer.name} ---`);
      const processor = new InventoryProcessor(retailer, config);
      
      // Override the fetchAllSkus method to return only test SKUs
      processor.fetchAllSkus = async () => testSkus;
      
      // Test each SKU individually to show detailed quantity information
      for (const sku of testSkus) {
        console.log(`\n🔍 Testing SKU: ${sku}`);
        
        try {
          // Get source inventory from LGL store
          const sourceVariant = await processor.getProductVariantAndInventoryItemIdAndLevels(processor.lglClient, sku);
          if (!sourceVariant) {
            console.log(`  ❌ Not found in LGL store`);
            continue;
          }
          
          const sourceLevel = sourceVariant.inventoryLevels.find(l => {
            const availableObj = l.quantities.find(q => q.name === "available");
            return availableObj !== undefined;
          });
          
          if (!sourceLevel) {
            console.log(`  ❌ No available inventory in LGL store`);
            continue;
          }
          
          const sourceAvailable = sourceLevel.quantities.find(q => q.name === "available").quantity;
          console.log(`  📦 LGL Store Quantity: ${sourceAvailable}`);
          
          // Get target inventory from retailer store
          const targetVariant = await processor.getProductVariantAndInventoryItemIdAndLevels(processor.retailClient, sku);
          if (!targetVariant) {
            console.log(`  ❌ Not found in retailer store`);
            continue;
          }
          
          const targetLevel = targetVariant.inventoryLevels[0];
          if (!targetLevel) {
            console.log(`  ❌ No inventory levels in retailer store`);
            continue;
          }
          
          const targetLocationId = targetLevel.location.id;
          const targetAvailable = targetLevel.quantities.find(q => q.name === "available")?.quantity ?? 0;
          const expectedRetailerLocationId = retailer.targetLocationId;
          
          console.log(`  🏪 Retailer Store Quantity: ${targetAvailable}`);
          console.log(`  📍 Retailer Location: ${targetLocationId}`);
          console.log(`  🎯 Expected Location: ${expectedRetailerLocationId}`);
          
          // Check location match
          if (targetLocationId !== expectedRetailerLocationId) {
            console.log(`  ⚠️ Location mismatch - SKU in wrong location`);
            console.log(`  📊 Quantity comparison: ${targetAvailable} (retailer) vs ${sourceAvailable} (LGL)`);
            console.log(`  🔄 Would update to: ${sourceAvailable} (if location was correct)`);
          } else {
            console.log(`  ✅ Location match - SKU in correct location`);
            console.log(`  📊 Quantity comparison: ${targetAvailable} (retailer) vs ${sourceAvailable} (LGL)`);
            
            if (sourceAvailable !== targetAvailable) {
              console.log(`  🔄 UPDATE NEEDED: ${targetAvailable} → ${sourceAvailable}`);
            } else {
              console.log(`  ✅ Quantities match - no update needed`);
            }
          }
          
        } catch (error) {
          console.log(`  ❌ Error processing ${sku}: ${error.message}`);
        }
      }
      
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
      
      console.log(`\n📊 Summary for ${retailer.name}:`);
      console.log(`  ✅ Successful updates: ${inventoryResult?.successfulUpdates || 0}`);
      console.log(`  ⚠️ Location mismatches: ${inventoryResult?.locationMismatches || 0}`);
      console.log(`  ❌ Failures: ${inventoryResult?.failures || 0}`);
      
    } catch (error) {
      console.error(`❌ Failed to process inventory sync for ${retailer.name}:`, error);
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
  const config = loadConfig();
  const retailers = loadRetailers();
  const emailNotifier = new DatabaseEmailNotifier(config);
  
  console.log(`Testing inventory sync for ${retailers.length} retailer(s) with 5 test SKUs`);
  
  const startTime = new Date();
  const summary = {
    operation: 'inventory-test',
    startTime: startTime.toISOString(),
    retailers: retailers.map(r => r.name),
    results: {}
  };
  
  try {
    summary.results.inventory = await testInventorySync(retailers, config);
    
    // Send inventory-specific alert
    await emailNotifier.sendInventoryAlert(summary.results);
    
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'success';
    
    console.log('\n🎉 Test completed successfully!');
    console.log(`📊 Final Results: ${summary.results.inventory.successfulUpdates} successful, ${summary.results.inventory.locationMismatches} mismatches, ${summary.results.inventory.failures} failures`);
    
  } catch (error) {
    summary.endTime = new Date().toISOString();
    summary.duration = new Date() - startTime;
    summary.status = 'error';
    summary.error = error.message;
    
    console.error('❌ Test failed:', error);
    
    // Send error notification
    await emailNotifier.sendErrorNotification(error, {
      operation: 'inventory-test',
      retailers: retailers.map(r => r.name)
    });
    
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testInventorySync }; 