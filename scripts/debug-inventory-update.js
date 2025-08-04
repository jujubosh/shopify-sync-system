// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const path = require('path');
const fs = require('fs');

// Import the necessary functions from the nationwide-plants file
const nationwidePlantsPath = path.join(__dirname, '../inventory-sync/retailers/nationwide-plants.js');

// Load the configuration
function loadGlobalConfig() {
    try {
        const configPath = path.join(__dirname, '../config/global-config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('Error loading global config:', error.message);
        return null;
    }
}

async function loadRetailerConfig() {
    try {
        const configPath = path.join(__dirname, '../config/retailers/nationwide-plants-config.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('Error loading retailer config:', error.message);
        return null;
    }
}

function resolveApiToken(token) {
    if (token.startsWith('SHOPIFY_') || token.startsWith('MAILGUN_') || token.startsWith('EMAIL_')) {
        return process.env[token] || null;
    }
    return token;
}

function getSourceStoreConfig(globalConfig) {
    return {
        url: globalConfig.lglStore.domain,
        accessToken: resolveApiToken(globalConfig.lglStore.apiToken)
    };
}

function getTargetStoreConfig(retailerConfig) {
    return {
        url: retailerConfig.domain,
        accessToken: resolveApiToken(retailerConfig.apiToken)
    };
}

function getShopifyClient(store) {
    if (!store.accessToken) {
        throw new Error(`Missing access token for store: ${store.url}`);
    }
    
    const axios = require('axios');
    return axios.create({
        baseURL: `https://${store.url}/admin/api/2025-04/graphql.json`,
        headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });
}

const GET_PRODUCT_BY_SKU_WITH_LEVELS = `
    query getProductBySku($sku: String!) {
        productVariants(first: 1, query: $sku) {
            edges {
                node {
                    id
                    sku
                    inventoryItem {
                        id
                        inventoryLevels(first: 10) {
                            edges {
                                node {
                                    id
                                    location {
                                        id
                                    }
                                    quantities(names: ["available"]) {
                                        name
                                        quantity
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;

const SET_INVENTORY_QUANTITIES = `
    mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
            inventoryAdjustmentGroup {
                reason
                changes {
                    name
                    delta
                }
            }
            userErrors {
                field
                message
            }
        }
    }
`;

async function getProductVariantAndInventoryItemIdAndLevels(client, sku) {
    try {
        const response = await client.post('', {
            query: GET_PRODUCT_BY_SKU_WITH_LEVELS,
            variables: { sku: `sku:${sku}` }
        });
        
        if (!response.data || !response.data.data) {
            console.log(`Invalid API response for SKU ${sku}: ${JSON.stringify(response.data)}`);
            return null;
        }
        
        if (!response.data.data.productVariants) {
            console.log(`No productVariants in response for SKU ${sku}: ${JSON.stringify(response.data.data)}`);
            return null;
        }
        
        const variant = response.data.data.productVariants.edges[0]?.node;
        if (!variant) {
            console.log(`No variant found for SKU: ${sku}`);
            return null;
        }
        
        if (!variant.inventoryItem) {
            console.log(`No inventory item for SKU ${sku}`);
            return null;
        }
        
        return {
            variantId: variant.id,
            inventoryItemId: variant.inventoryItem.id,
            inventoryLevels: variant.inventoryItem.inventoryLevels.edges.map(e => e.node)
        };
    } catch (error) {
        console.log(`Error getting product variant for SKU ${sku}: ${error.message}`);
        if (error.response?.data) {
            console.log(`API error details: ${JSON.stringify(error.response.data)}`);
        }
        return null;
    }
}

async function testInventoryUpdate(sku) {
    console.log(`\n=== Testing SKU: ${sku} ===`);
    
    // Load configurations
    const globalConfig = loadGlobalConfig();
    const retailerConfig = await loadRetailerConfig();
    
    if (!globalConfig || !retailerConfig) {
        console.log('Failed to load configurations');
        return;
    }
    
    const sourceStoreConfig = getSourceStoreConfig(globalConfig);
    const targetStoreConfig = getTargetStoreConfig(retailerConfig);
    
    const sourceClient = getShopifyClient(sourceStoreConfig);
    const targetClient = getShopifyClient(targetStoreConfig);
    
    console.log(`Source store: ${sourceStoreConfig.url}`);
    console.log(`Target store: ${targetStoreConfig.url}`);
    console.log(`Target location ID: ${retailerConfig.targetLocationId}`);
    
    // Get source inventory
    console.log('\n--- Source Inventory ---');
    const sourceVariant = await getProductVariantAndInventoryItemIdAndLevels(sourceClient, sku);
    if (!sourceVariant) {
        console.log('❌ Source variant not found');
        return;
    }
    
    console.log(`Source variant ID: ${sourceVariant.variantId}`);
    console.log(`Source inventory item ID: ${sourceVariant.inventoryItemId}`);
    console.log(`Source inventory levels: ${sourceVariant.inventoryLevels.length}`);
    
    const sourceLevel = sourceVariant.inventoryLevels.find(l => {
        const availableObj = l.quantities.find(q => q.name === "available");
        return availableObj !== undefined;
    });
    
    if (!sourceLevel) {
        console.log('❌ No source inventory level found');
        return;
    }
    
    const sourceAvailable = sourceLevel.quantities.find(q => q.name === "available").quantity;
    console.log(`Source available quantity: ${sourceAvailable}`);
    console.log(`Source location ID: ${sourceLevel.location.id}`);
    
    // Get target inventory
    console.log('\n--- Target Inventory ---');
    const targetVariant = await getProductVariantAndInventoryItemIdAndLevels(targetClient, sku);
    if (!targetVariant) {
        console.log('❌ Target variant not found');
        return;
    }
    
    console.log(`Target variant ID: ${targetVariant.variantId}`);
    console.log(`Target inventory item ID: ${targetVariant.inventoryItemId}`);
    console.log(`Target inventory levels: ${targetVariant.inventoryLevels.length}`);
    
    // List all target locations
    console.log('\nTarget locations:');
    targetVariant.inventoryLevels.forEach((level, index) => {
        const available = level.quantities.find(q => q.name === "available")?.quantity ?? 0;
        console.log(`  ${index + 1}. Location: ${level.location.id}, Available: ${available}`);
    });
    
    const targetLevel = targetVariant.inventoryLevels.find(l => l.location.id === retailerConfig.targetLocationId);
    if (!targetLevel) {
        console.log(`❌ Target location ${retailerConfig.targetLocationId} not found`);
        return;
    }
    
    const targetAvailable = targetLevel.quantities.find(q => q.name === "available")?.quantity ?? 0;
    console.log(`Target available quantity: ${targetAvailable}`);
    
    // Test the update
    console.log('\n--- Testing Update ---');
    console.log(`Attempting to update from ${targetAvailable} to ${sourceAvailable}`);
    
    try {
        const response = await targetClient.post('', {
            query: SET_INVENTORY_QUANTITIES,
            variables: {
                input: {
                    name: "available",
                    reason: "correction",
                    ignoreCompareQuantity: true,
                    quantities: [
                        {
                            inventoryItemId: targetVariant.inventoryItemId,
                            locationId: retailerConfig.targetLocationId,
                            quantity: sourceAvailable
                        }
                    ]
                }
            }
        });
        
        console.log('API Response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.data.inventorySetQuantities.userErrors.length > 0) {
            const errors = response.data.data.inventorySetQuantities.userErrors;
            console.log('❌ User errors:');
            errors.forEach(error => {
                console.log(`  - ${error.field}: ${error.message}`);
            });
        } else {
            console.log('✅ Update successful!');
        }
        
    } catch (error) {
        console.log('❌ API call failed:');
        console.log(`  Error: ${error.message}`);
        if (error.response?.data) {
            console.log(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        if (error.response?.status) {
            console.log(`  Status: ${error.response.status}`);
        }
    }
}

async function main() {
    const skus = process.argv.slice(2);
    
    if (skus.length === 0) {
        console.log('Usage: node debug-inventory-update.js <sku1> <sku2> ...');
        console.log('Example: node debug-inventory-update.js EDB-OLI-ARB-NA-4IN EDB-OLI-ARB-NA-6in');
        return;
    }
    
    console.log(`Testing ${skus.length} SKU(s): ${skus.join(', ')}`);
    
    for (const sku of skus) {
        await testInventoryUpdate(sku);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testInventoryUpdate }; 