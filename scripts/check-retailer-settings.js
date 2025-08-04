const { RetailerService } = require('./utils/retailer-service');

async function checkRetailerSettings() {
  try {
    const retailerService = new RetailerService();
    const retailers = await retailerService.loadRetailers();
    
    console.log('=== Current Retailer Database Settings ===\n');
    
    retailers.forEach(retailer => {
      console.log(`📋 ${retailer.name} (${retailer.domain})`);
      console.log(`   ID: ${retailer.id}`);
      console.log(`   Enabled: ${retailer.settings.enabled ? '✅' : '❌'}`);
      console.log(`   Import Orders: ${retailer.settings.importOrders ? '✅' : '❌'}`);
      console.log(`   Push Fulfillments: ${retailer.settings.pushFulfillments ? '✅' : '❌'}`);
      console.log(`   Sync Inventory: ${retailer.settings.syncInventory ? '✅' : '❌'}`);
      console.log(`   Lookback Hours: ${retailer.settings.lookbackHours}`);
      console.log(`   Fulfillment Lookback: ${retailer.settings.fulfillmentLookbackHours}`);
      console.log('');
    });
    
    // Summary
    const enabledCount = retailers.filter(r => r.settings.enabled).length;
    const importOrdersCount = retailers.filter(r => r.settings.importOrders).length;
    const pushFulfillmentsCount = retailers.filter(r => r.settings.pushFulfillments).length;
    const syncInventoryCount = retailers.filter(r => r.settings.syncInventory).length;
    
    console.log('=== Summary ===');
    console.log(`Total Retailers: ${retailers.length}`);
    console.log(`Enabled: ${enabledCount}/${retailers.length}`);
    console.log(`Import Orders Enabled: ${importOrdersCount}/${retailers.length}`);
    console.log(`Push Fulfillments Enabled: ${pushFulfillmentsCount}/${retailers.length}`);
    console.log(`Sync Inventory Enabled: ${syncInventoryCount}/${retailers.length}`);
    
  } catch (error) {
    console.error('Error checking retailer settings:', error);
    process.exit(1);
  }
}

checkRetailerSettings(); 