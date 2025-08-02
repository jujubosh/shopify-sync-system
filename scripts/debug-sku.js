const fs = require('fs');
const path = require('path');
const { InventoryProcessor } = require('./utils/inventory-processor');

function loadConfig() {
  // Use test config for debugging
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

async function debugSku(sku) {
  console.log(`🔍 Debugging SKU: ${sku}`);
  
  const config = loadConfig();
  const retailers = loadRetailers();
  
  for (const retailer of retailers) {
    if (!retailer.settings.enabled || !retailer.settings.syncInventory) {
      console.log(`Skipping ${retailer.name}: disabled`);
      continue;
    }
    
    console.log(`\n--- ${retailer.name} ---`);
    
    // Check if API token is available
    const apiTokenKey = retailer.apiToken;
    const apiToken = process.env[apiTokenKey];
    if (!apiToken) {
      console.log(`❌ API token not found for ${retailer.name}: ${apiTokenKey}`);
      continue;
    }
    console.log(`✅ API token found for ${retailer.name}`);
    
    const processor = new InventoryProcessor(retailer, config);
    
    try {
      // Get source inventory from LGL store
      console.log('📦 LGL Store (Source):');
      const sourceVariant = await processor.getProductVariantAndInventoryItemIdAndLevels(processor.lglClient, sku);
      if (sourceVariant) {
        console.log(`  ✅ Found in LGL store`);
        console.log(`  📍 Inventory Item ID: ${sourceVariant.inventoryItemId}`);
        console.log(`  📊 Inventory Levels: ${sourceVariant.inventoryLevels.length}`);
        
        sourceVariant.inventoryLevels.forEach((level, index) => {
          const available = level.quantities.find(q => q.name === "available");
          console.log(`    Level ${index + 1}:`);
          console.log(`      📍 Location ID: ${level.location.id}`);
          console.log(`      🏪 Location Name: ${level.location.name}`);
          console.log(`      📦 Available: ${available ? available.quantity : 'N/A'}`);
        });
      } else {
        console.log(`  ❌ Not found in LGL store`);
      }
      
      // Get target inventory from retailer store
      console.log('\n🏪 Retailer Store (Target):');
      const targetVariant = await processor.getProductVariantAndInventoryItemIdAndLevels(processor.retailClient, sku);
      if (targetVariant) {
        console.log(`  ✅ Found in retailer store`);
        console.log(`  📍 Inventory Item ID: ${targetVariant.inventoryItemId}`);
        console.log(`  📊 Inventory Levels: ${targetVariant.inventoryLevels.length}`);
        
        targetVariant.inventoryLevels.forEach((level, index) => {
          const available = level.quantities.find(q => q.name === "available");
          console.log(`    Level ${index + 1}:`);
          console.log(`      📍 Location ID: ${level.location.id}`);
          console.log(`      🏪 Location Name: ${level.location.name}`);
          console.log(`      📦 Available: ${available ? available.quantity : 'N/A'}`);
        });
      } else {
        console.log(`  ❌ Not found in retailer store`);
      }
      
      // Check location match
      if (sourceVariant && targetVariant) {
        const sourceLevel = sourceVariant.inventoryLevels.find(l => {
          const availableObj = l.quantities.find(q => q.name === "available");
          return availableObj !== undefined;
        });
        
        const targetLevel = targetVariant.inventoryLevels[0];
        
        if (sourceLevel && targetLevel) {
          const expectedLocationId = sourceLevel.location.id;
          const actualLocationId = targetLevel.location.id;
          
          console.log('\n🔍 Location Comparison:');
          console.log(`  Expected (LGL): ${expectedLocationId}`);
          console.log(`  Actual (Retailer): ${actualLocationId}`);
          console.log(`  Match: ${expectedLocationId === actualLocationId ? '✅ YES' : '❌ NO'}`);
          
          if (expectedLocationId !== actualLocationId) {
            console.log(`  ⚠️ Location mismatch detected!`);
            console.log(`  Expected location: ${expectedLocationId}`);
            console.log(`  Actual location: ${actualLocationId}`);
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error debugging ${retailer.name}:`, error.message);
    }
  }
}

async function main() {
  const sku = process.argv[2] || 'EDB-OLI-ARB-NA-3G';
  await debugSku(sku);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { debugSku }; 