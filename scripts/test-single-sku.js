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

async function testSingleSku() {
  console.log('=== Testing Single SKU Sync ===');
  
  const config = loadConfig();
  const retailers = loadRetailers();
  
  const retailerId = process.env.RETAILER_ID || retailers[0]?.id;
  const retailer = retailers.find(r => r.id === retailerId);
  
  if (!retailer) {
    console.error(`Retailer with ID '${retailerId}' not found`);
    process.exit(1);
  }
  
  console.log(`Testing single SKU sync for retailer: ${retailer.name}`);
  console.log(`Target location: ${retailer.targetLocationId}`);
  
  try {
    const processor = new InventoryProcessor(retailer, config);
    
    // Test with a specific SKU that we know has inventory
    const testSku = 'EDB-AVO-PAN-23-3G'; // This one showed 6 in inventory
    
    console.log(`Testing SKU: ${testSku}`);
    
    // Test source client (LGL)
    console.log('\n--- Testing Source Client (LGL) ---');
    try {
      const sourceVariant = await processor.getProductVariantAndInventoryItemIdAndLevels(processor.lglClient, testSku);
      if (sourceVariant) {
        console.log('✅ Source variant found:', {
          variantId: sourceVariant.variantId,
          inventoryItemId: sourceVariant.inventoryItemId,
          levelsCount: sourceVariant.inventoryLevels.length
        });
        sourceVariant.inventoryLevels.forEach((level, index) => {
          const available = level.quantities.find(q => q.name === "available");
          console.log(`  Level ${index + 1}: Location ${level.location.id}, Available: ${available?.quantity || 0}`);
        });
      } else {
        console.log('❌ Source variant not found');
      }
    } catch (error) {
      console.log('❌ Source client error:', error.message);
    }
    
    // Test target client (retailer)
    console.log('\n--- Testing Target Client (Retailer) ---');
    try {
      const targetVariant = await processor.getProductVariantAndInventoryItemIdAndLevels(processor.retailClient, testSku);
      if (targetVariant) {
        console.log('✅ Target variant found:', {
          variantId: targetVariant.variantId,
          inventoryItemId: targetVariant.inventoryItemId,
          levelsCount: targetVariant.inventoryLevels.length
        });
        targetVariant.inventoryLevels.forEach((level, index) => {
          const available = level.quantities.find(q => q.name === "available");
          console.log(`  Level ${index + 1}: Location ${level.location.id}, Available: ${available?.quantity || 0}`);
        });
        
        // Check if target location exists
        const targetLevel = targetVariant.inventoryLevels.find(l => l.location.id === retailer.targetLocationId);
        if (targetLevel) {
          console.log('✅ Target location found in variant');
        } else {
          console.log('❌ Target location NOT found in variant');
          console.log('Available locations:', targetVariant.inventoryLevels.map(l => l.location.id));
        }
      } else {
        console.log('❌ Target variant not found');
      }
    } catch (error) {
      console.log('❌ Target client error:', error.message);
    }
    
    // Test full sync
    console.log('\n--- Testing Full Sync ---');
    try {
      const result = await processor.syncInventory(testSku, processor.lglClient, processor.retailClient);
      console.log('Sync result:', result);
    } catch (error) {
      console.log('❌ Sync error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSingleSku(); 