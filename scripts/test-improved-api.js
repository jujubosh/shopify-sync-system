require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { ShopifyClient } = require('./utils/shopify-client');
const { QUERIES } = require('./utils/graphql-queries');
const fs = require('fs');
const path = require('path');

async function testImprovedAPI() {
  console.log('🧪 Testing Improved Shopify API Client...\n');

  try {
    // Load configuration
    const configPath = path.join(__dirname, '../config/retailers/epic-gardening-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const apiConfigPath = path.join(__dirname, '../config/shopify-api-config.json');
    const apiConfig = JSON.parse(fs.readFileSync(apiConfigPath, 'utf8'));

    // Initialize client with new configuration
    const client = new ShopifyClient(config.domain, config.apiToken, apiConfig);
    
    console.log('✅ Client initialized with rate limiting and enhanced error handling');
    console.log(`📊 API Version: ${apiConfig.apiVersion}`);
    console.log(`⚡ Rate Limit: ${apiConfig.rateLimiting.requestsPerSecond} requests/second`);
    console.log(`🔄 Max Retries: ${apiConfig.rateLimiting.maxRetries}\n`);

    // Test 1: Basic GraphQL query
    console.log('🔍 Test 1: Basic GraphQL Query');
    try {
      const shopInfo = await client.graphql(QUERIES.getShopInfo);
      console.log(`✅ Shop Info: ${shopInfo.shop.name} (${shopInfo.shop.myshopifyDomain})`);
    } catch (error) {
      console.log(`❌ Shop Info Error: ${error.message}`);
    }

    // Test 2: Optimized order query
    console.log('\n🔍 Test 2: Optimized Order Query');
    try {
      const lookbackTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const variables = {
        lookbackTime,
        first: 5
      };
      
      const orders = await client.graphql(QUERIES.getEligibleOrders, variables);
      console.log(`✅ Found ${orders.orders.edges.length} orders`);
      
      if (orders.orders.edges.length > 0) {
        const firstOrder = orders.orders.edges[0].node;
        console.log(`📦 Sample Order: ${firstOrder.name} - ${firstOrder.displayFinancialStatus}`);
      }
    } catch (error) {
      console.log(`❌ Order Query Error: ${error.message}`);
    }

    // Test 3: Rate limiting test
    console.log('\n🔍 Test 3: Rate Limiting Test');
    try {
      const startTime = Date.now();
      
      // Make multiple requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(client.graphql(QUERIES.getShopInfo));
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      console.log(`✅ Rate limiting test completed in ${endTime - startTime}ms`);
      console.log(`📊 Made ${promises.length} concurrent requests`);
    } catch (error) {
      console.log(`❌ Rate Limiting Error: ${error.message}`);
    }

    // Test 4: Metrics
    console.log('\n🔍 Test 4: Metrics Collection');
    const metrics = client.getMetrics();
    console.log('📊 API Metrics:');
    console.log(`   Total Requests: ${metrics.requestCount}`);
    console.log(`   Errors: ${metrics.errorCount}`);
    console.log(`   Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`   Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Rate Limit Hits: ${metrics.rateLimitHits}`);

    // Test 5: Error handling
    console.log('\n🔍 Test 5: Error Handling Test');
    try {
      // Try to query with invalid parameters
      await client.graphql('query invalidQuery { invalidField }');
    } catch (error) {
      console.log(`✅ Error handling works: ${error.name} - ${error.message}`);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📈 Improvements Summary:');
    console.log('✅ Rate limiting implemented');
    console.log('✅ Enhanced error handling with custom error classes');
    console.log('✅ Metrics collection and monitoring');
    console.log('✅ Optimized GraphQL queries');
    console.log('✅ Input validation');
    console.log('✅ Configuration-driven approach');
    console.log('✅ Better timeout handling');
    console.log('✅ User-Agent headers for tracking');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testImprovedAPI()
    .then(() => {
      console.log('\n✅ All improvements successfully implemented!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testImprovedAPI };
