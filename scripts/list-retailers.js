const { DatabaseService } = require('./utils/database-service');

async function listRetailers() {
  const dbService = new DatabaseService();
  
  try {
    console.log('📋 Current retailers in database:\n');
    
    const retailers = await dbService.getRetailers();
    
    if (retailers.length === 0) {
      console.log('No retailers found in database.');
      return;
    }
    
    retailers.forEach((retailer, index) => {
      console.log(`${index + 1}. ${retailer.name}`);
      console.log(`   ID: ${retailer.id}`);
      console.log(`   Domain: ${retailer.domain}`);
      console.log(`   Enabled: ${retailer.enabled ? '✅' : '❌'}`);
      console.log(`   Import Orders: ${retailer.import_orders ? '✅' : '❌'}`);
      console.log(`   Push Fulfillments: ${retailer.push_fulfillments ? '✅' : '❌'}`);
      console.log(`   Sync Inventory: ${retailer.sync_inventory ? '✅' : '❌'}`);
      console.log(`   Created: ${new Date(retailer.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log(`Total retailers: ${retailers.length}`);
    
  } catch (error) {
    console.error('❌ Error listing retailers:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  listRetailers();
}

module.exports = { listRetailers }; 