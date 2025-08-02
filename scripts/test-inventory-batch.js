const fs = require('fs');
const path = require('path');
const { InventoryProcessor } = require('./utils/inventory-processor');

function loadConfig() {
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

async function testInventorySync() {
  console.log('=== Testing Batch Inventory Sync ===');
  
  const config = loadConfig();
  const retailers = loadRetailers();
  
  // Test with a specific retailer or the first one
  const retailerId = process.env.RETAILER_ID || retailers[0]?.id;
  const retailer = retailers.find(r => r.id === retailerId);
  
  if (!retailer) {
    console.error(`Retailer with ID '${retailerId}' not found`);
    process.exit(1);
  }
  
  if (!retailer.settings.enabled || !retailer.settings.syncInventory) {
    console.log(`Skipping ${retailer.name}: disabled or inventory sync disabled`);
    return;
  }
  
  console.log(`Testing inventory sync for retailer: ${retailer.name}`);
  console.log(`Target location: ${retailer.targetLocationId}`);
  
  try {
    const processor = new InventoryProcessor(retailer, config);
    
    // Test with a small batch first
    console.log('Starting inventory sync test...');
    const results = await processor.processInventorySync();
    
    console.log('\n=== Test Results ===');
    console.log(`Total SKUs processed: ${results.total}`);
    console.log(`Successfully updated: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Checked (no update needed): ${results.checked.length}`);
    console.log(`SKUs in wrong location: ${results.audit.wrongLocation.length}`);
    
    if (results.success.length > 0) {
      console.log('\nSuccessfully updated SKUs:');
      results.success.slice(0, 5).forEach(sku => console.log(`  - ${sku}`));
      if (results.success.length > 5) {
        console.log(`  ... and ${results.success.length - 5} more`);
      }
    }
    
    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.slice(0, 5).forEach(error => console.log(`  - ${error}`));
      if (results.errors.length > 5) {
        console.log(`  ... and ${results.errors.length - 5} more`);
      }
    }
    
    if (results.audit.wrongLocation.length > 0) {
      console.log('\nSKUs in wrong location:');
      results.audit.wrongLocation.slice(0, 5).forEach(item => {
        console.log(`  - ${item.sku}: currently in ${item.currentLocation}, should be in ${item.targetLocation}`);
      });
      if (results.audit.wrongLocation.length > 5) {
        console.log(`  ... and ${results.audit.wrongLocation.length - 5} more`);
      }
    }
    
    if (results.checked.length > 0) {
      console.log('\nSKUs checked (no update needed):');
      results.checked.slice(0, 5).forEach(item => console.log(`  - ${item.sku}: ${item.message}`));
      if (results.checked.length > 5) {
        console.log(`  ... and ${results.checked.length - 5} more`);
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testInventorySync(); 