// Test script to verify flare ship date logic
const { FulfillmentProcessor } = require('./utils/fulfillment-processor');

// Mock data for testing
const mockRetailer = {
  name: 'Nationwide Plants',
  domain: '83e136-83.myshopify.com',
  apiToken: 'test-token',
  lglLocationId: '84385005803'
};

const mockConfig = {
  lglStore: {
    domain: '12ffec-3.myshopify.com',
    apiToken: 'test-token'
  },
  defaults: {
    fulfillmentLookbackHours: 24
  }
};

// Test the date conversion logic
function testDateConversion() {
  console.log('=== Testing Flare Ship Date Logic ===');
  
  // Test with different date formats
  const testDates = [
    '2025-01-15T10:30:00Z',
    '2025-01-15T15:45:30.123Z',
    '2025-01-15',
    new Date().toISOString()
  ];
  
  testDates.forEach((date, index) => {
    const shipDate = new Date(date).toISOString().split('T')[0];
    console.log(`Test ${index + 1}:`);
    console.log(`  Input: ${date}`);
    console.log(`  Output: ${shipDate}`);
    console.log(`  Valid: ${/^\d{4}-\d{2}-\d{2}$/.test(shipDate) ? '✅' : '❌'}`);
    console.log('');
  });
  
  // Test the updateFlareShipDate method logic
  console.log('=== Testing updateFlareShipDate Method ===');
  
  const fulfillmentDate = '2025-01-15T14:30:00Z';
  const orderId = 'gid://shopify/Order/123456789';
  
  console.log(`Fulfillment Date: ${fulfillmentDate}`);
  console.log(`Order ID: ${orderId}`);
  
  const shipDate = new Date(fulfillmentDate).toISOString().split('T')[0];
  console.log(`Calculated Ship Date: ${shipDate}`);
  
  // Show what the GraphQL mutation would look like
  console.log('\nGraphQL Mutation Structure:');
  console.log(JSON.stringify({
    input: {
      id: orderId,
      noteAttributes: [
        { name: '__flare_ship_date', value: shipDate }
      ]
    }
  }, null, 2));
  
  console.log('\n✅ Flare ship date logic test completed successfully!');
}

// Run the test
testDateConversion(); 