import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from .env.local');
}

// Configuration
const CONFIG_PATH = '../config/retailers/nationwide-plants-config.json';
const GLOBAL_CONFIG_PATH = '../config/global-config-test.json';

// Load retailer configuration
function loadRetailerConfig() {
    try {
        const configPath = new URL(CONFIG_PATH, import.meta.url).pathname;
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config;
    } catch (error) {
        console.error('Failed to load retailer config:', error.message);
        throw error;
    }
}

// Load global configuration for testing
function loadGlobalConfig() {
    try {
        const globalConfigPath = new URL(GLOBAL_CONFIG_PATH, import.meta.url).pathname;
        if (fs.existsSync(globalConfigPath)) {
            const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
            console.log('Loaded global test configuration');
            return globalConfig;
        }
        return null;
    } catch (error) {
        console.warn('Failed to load global test config:', error.message);
        return null;
    }
}

// Source store configuration (LGL - source of truth)
const SOURCE_STORE = {
    url: '12ffec-3.myshopify.com',
    accessToken: process.env.SHOPIFY_LGL_TOKEN
};

// Target store configuration (Nationwide Plants)
const TARGET_STORE = {
    url: '83e136-83.myshopify.com',
    accessToken: process.env.SHOPIFY_NATIONWIDE_PLANTS_TOKEN
};

// GraphQL queries
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

const UPDATE_INVENTORY = `
    mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
        inventoryAdjustQuantities(input: $input) {
            userErrors {
                field
                message
            }
        }
    }
`;

function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
}

function getShopifyClient(store) {
    if (!store.accessToken) {
        throw new Error(`Missing access token for store: ${store.url}`);
    }
    
    return axios.create({
        baseURL: `https://${store.url}/admin/api/2025-04/graphql.json`,
        headers: {
            'X-Shopify-Access-Token': store.accessToken,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });
}

async function getProductVariantAndInventoryItemIdAndLevels(client, sku) {
    try {
        const response = await client.post('', {
            query: GET_PRODUCT_BY_SKU_WITH_LEVELS,
            variables: { sku: `sku:${sku}` }
        });
        
        const variant = response.data.data.productVariants.edges[0]?.node;
        if (!variant) {
            log(`No variant found for SKU: ${sku}`, 'warn');
            return null;
        }
        
        return {
            variantId: variant.id,
            inventoryItemId: variant.inventoryItem.id,
            inventoryLevels: variant.inventoryItem.inventoryLevels.edges.map(e => e.node)
        };
    } catch (error) {
        log(`Error getting product variant for SKU ${sku}: ${error.message}`, 'error');
        throw error;
    }
}

async function updateTargetInventory(client, inventoryItemId, locationId, newQuantity, currentQuantity) {
    try {
        const delta = newQuantity - currentQuantity;
        if (delta === 0) {
            log('Target inventory already matches source. No update needed.');
            return true;
        }
        
        log(`Attempting to update inventory: current=${currentQuantity}, new=${newQuantity}, delta=${delta}`);
        
        const response = await client.post('', {
            query: UPDATE_INVENTORY,
            variables: {
                input: {
                    reason: "correction",
                    name: "available",
                    changes: [
                        {
                            inventoryItemId,
                            locationId,
                            delta
                        }
                    ]
                }
            }
        });
        
        if (response.data.data.inventoryAdjustQuantities.userErrors.length > 0) {
            const errors = response.data.data.inventoryAdjustQuantities.userErrors;
            log(`Error updating inventory: ${JSON.stringify(errors)}`, 'error');
            return false;
        }
        
        log(`Successfully updated inventory. Delta: ${delta}`);
        return true;
    } catch (error) {
        log(`Error updating target inventory: ${error.response?.data || error.message}`, 'error');
        return false;
    }
}

async function testSingleSku(sku) {
    try {
        log(`Testing SKU: ${sku}`);
        
        // Load configurations
        const retailerConfig = loadRetailerConfig();
        const globalConfig = loadGlobalConfig();
        const targetLocationId = retailerConfig.targetLocationId; // Use the targetLocationId from config
        
        log(`Using target location ID: ${targetLocationId}`);
        
        // Validate environment variables
        if (!SOURCE_STORE.accessToken) {
            throw new Error('Missing SHOPIFY_LGL_TOKEN environment variable');
        }
        if (!TARGET_STORE.accessToken) {
            throw new Error('Missing SHOPIFY_NATIONWIDE_PLANTS_TOKEN environment variable');
        }
        
        const sourceClient = getShopifyClient(SOURCE_STORE);
        const targetClient = getShopifyClient(TARGET_STORE);
        
        // Get source inventory
        log('Getting source inventory...');
        const sourceVariant = await getProductVariantAndInventoryItemIdAndLevels(sourceClient, sku);
        if (!sourceVariant) {
            log(`Failed to get source inventory item for SKU: ${sku}`, 'error');
            return false;
        }
        
        // Find the inventory level with available quantity for the source SKU
        const sourceLevel = sourceVariant.inventoryLevels.find(l => {
            const availableObj = l.quantities.find(q => q.name === "available");
            return availableObj !== undefined;
        });
        
        if (!sourceLevel) {
            log(`Failed to find any inventory level with available quantity for source SKU: ${sku}`, 'error');
            return false;
        }
        
        const sourceAvailable = sourceLevel.quantities.find(q => q.name === "available").quantity;
        const sourceLocationId = sourceLevel.location.id;
        log(`Source inventory for ${sku}: ${sourceAvailable} at location ${sourceLocationId}`);
        
        // Get target inventory
        log('Getting target inventory...');
        const targetVariant = await getProductVariantAndInventoryItemIdAndLevels(targetClient, sku);
        if (!targetVariant) {
            log(`Failed to get target inventory item for SKU: ${sku}`, 'error');
            return false;
        }
        
        // Find the inventory level for the target location
        const targetLevel = targetVariant.inventoryLevels.find(l => l.location.id === targetLocationId);
        const targetAvailable = targetLevel ? (targetLevel.quantities.find(q => q.name === "available")?.quantity ?? 0) : 0;
        
        log(`Target inventory for ${sku}: ${targetAvailable} at location ${targetLocationId}`);
        
        // Update target inventory to match source
        const success = await updateTargetInventory(targetClient, targetVariant.inventoryItemId, targetLocationId, sourceAvailable, targetAvailable);
        
        if (success) {
            log(`✅ Successfully synced inventory for SKU: ${sku}`);
            return true;
        } else {
            log(`❌ Failed to sync inventory for SKU: ${sku}`, 'error');
            return false;
        }
    } catch (error) {
        log(`❌ Error testing SKU ${sku}: ${error.message}`, 'error');
        return false;
    }
}

// Main function
async function main() {
    const sku = process.argv[2] || 'EDB-OLI-ARB-NA-3G';
    
    log(`Starting test for SKU: ${sku}`);
    
    const result = await testSingleSku(sku);
    
    if (result) {
        log(`✅ Test completed successfully for ${sku}`);
    } else {
        log(`❌ Test failed for ${sku}`);
        process.exit(1);
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
} 