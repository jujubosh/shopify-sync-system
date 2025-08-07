const { RetailerService } = require('./scripts/utils/retailer-service');
const { ShopifyClient } = require('./scripts/utils/shopify-client');

async function debugEpicGardening() {
  try {
    console.log('=== Debugging Epic Gardening ===');
    
    // Load Epic Gardening retailer
    const retailerService = new RetailerService();
    const epicGardening = await retailerService.loadRetailerById('epic-gardening');
    
    console.log('Epic Gardening config:', JSON.stringify(epicGardening, null, 2));
    
    // Test Shopify client
    const client = new ShopifyClient(epicGardening.domain, epicGardening.apiToken);
    console.log('Domain:', epicGardening.domain);
    console.log('API Token:', epicGardening.apiToken);
    console.log('Resolved API Token:', client.apiToken);
    console.log('Base URL:', client.baseUrl);
    
    // Test simple query
    const simpleQuery = 'query { shop { name } }';
    console.log('Testing simple query...');
    const shopData = await client.graphql(simpleQuery);
    console.log('Shop data:', shopData);
    
    // Test orders query
    const lookbackTime = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const ordersQuery = `
      query getOrders {
        orders(first: 5, query: "financial_status:paid -tag:imported-to-LGL created_at:>=${lookbackTime}") {
          edges {
            node {
              id
              name
              tags
            }
          }
        }
      }
    `;
    
    console.log('Testing orders query...');
    console.log('Lookback time:', lookbackTime);
    const ordersData = await client.graphql(ordersQuery);
    console.log('Orders data:', JSON.stringify(ordersData, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugEpicGardening(); 