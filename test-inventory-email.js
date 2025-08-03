const { DatabaseEmailNotifier } = require('./scripts/utils/database-email-notifier');
const fs = require('fs');
const path = require('path');

// Load config
function loadConfig() {
  const configFile = path.join(__dirname, 'config/global-config.json');
  return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

async function testInventoryEmailLogging() {
  console.log('🧪 Testing inventory sync email logging...');
  
  const config = loadConfig();
  const emailNotifier = new DatabaseEmailNotifier(config);
  
  // Create mock inventory results that match the actual structure
  const mockResults = {
    inventory: {
      total: 150,
      successfulUpdates: 120,
      locationMismatches: 20,
      failures: 10,
      details: {
        successfulUpdates: [
          { retailer: 'Nationwide Plants', sku: 'SKU001' },
          { retailer: 'Nationwide Plants', sku: 'SKU002' },
          { retailer: 'Test Retailer', sku: 'SKU003' }
        ],
        locationMismatches: [
          { 
            retailer: 'Nationwide Plants', 
            sku: 'SKU004',
            expectedLocation: 'Main Warehouse',
            actualLocation: 'Secondary Location'
          }
        ],
        failures: [
          { 
            retailer: 'Test Retailer', 
            sku: 'SKU005',
            error: 'SKU not found in target store'
          }
        ]
      }
    }
  };
  
  console.log('📧 Sending inventory alert...');
  console.log('Mock results:', JSON.stringify(mockResults, null, 2));
  
  try {
    await emailNotifier.sendInventoryAlert(mockResults);
    console.log('✅ Inventory alert sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send inventory alert:', error.message);
  }
  
  // Test error notification
  console.log('\n📧 Testing error notification...');
  try {
    await emailNotifier.sendErrorNotification(
      new Error('Test inventory sync error'),
      {
        operation: 'inventory',
        retailer: 'Test Retailer'
      }
    );
    console.log('✅ Error notification sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send error notification:', error.message);
  }
  
  console.log('\n🎉 Test completed!');
}

testInventoryEmailLogging().catch(console.error); 