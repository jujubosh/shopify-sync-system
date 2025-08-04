const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { DatabaseEmailNotifier } = require('../../scripts/utils/database-email-notifier');
const { RetailerService } = require('../../scripts/utils/retailer-service');

// Load environment variables from .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from .env.local');
}

// Configuration
const CONFIG_PATH = path.join(__dirname, '../../config/retailers/nationwide-plants-config.json');
const LOG_DIR = path.join(__dirname, '../../logs');
const GLOBAL_CONFIG_PATH = path.join(__dirname, '../../config/global-config.json');

// Load retailer configuration
async function loadRetailerConfig() {
    try {
        // First try to load from database
        const retailerService = new RetailerService();
        const retailer = await retailerService.loadRetailerById('nationwide-plants');
        
        if (!retailer.settings?.syncInventory) {
            throw new Error('Inventory sync is not enabled for this retailer');
        }
        
        console.log('Loaded retailer configuration from database');
        return retailer;
    } catch (error) {
        console.warn('Failed to load from database, falling back to config file:', error.message);
        
        // Fallback to config file
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        
        if (!config.settings?.syncInventory) {
            throw new Error('Inventory sync is not enabled for this retailer');
        }
        
        console.log('Loaded retailer configuration from config file');
        return config;
    }
}

// Load global configuration
function loadGlobalConfig() {
    try {
        if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
            const globalConfig = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8'));
            console.log('Loaded global configuration');
            return globalConfig;
        }
        return null;
    } catch (error) {
        console.warn('Failed to load global config:', error.message);
        return null;
    }
}

// Resolve API token with fallback logic (same as ShopifyClient)
function resolveApiToken(token) {
    // If it's an environment variable placeholder, resolve it
    if (token && token.startsWith('SHOPIFY_') && token.endsWith('_TOKEN')) {
        return process.env[token] || token;
    }
    // Otherwise use the token directly (from database)
    return token;
}

// Source store configuration (LGL - source of truth)
function getSourceStoreConfig(globalConfig) {
    return {
        url: globalConfig?.lglStore?.domain || '12ffec-3.myshopify.com',
        accessToken: resolveApiToken(globalConfig?.lglStore?.apiToken || process.env.SHOPIFY_LGL_TOKEN)
    };
}

// Target store configuration (Nationwide Plants)
function getTargetStoreConfig(retailerConfig) {
    return {
        url: retailerConfig.domain,
        accessToken: resolveApiToken(retailerConfig.apiToken)
    };
}



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

// Utility functions
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMessage);
    
    // Write to log file
    const logFile = path.join(LOG_DIR, `inventory-sync-nationwide-plants-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage + '\n');
}

async function retryWithBackoff(fn, maxRetries = null, initialDelay = 1000, globalConfig = null) {
    // Use global config max retries if available, otherwise default to 3
    const retryCount = maxRetries ?? globalConfig?.inventory?.maxRetries ?? 3;
    let retries = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (retries >= retryCount) {
                throw error;
            }
            const delayMs = initialDelay * Math.pow(2, retries);
            log(`Retry attempt ${retries + 1} after ${delayMs}ms delay for error: ${error.message}`, 'warn');
            await delay(delayMs);
            retries++;
        }
    }
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
        timeout: 30000 // 30 second timeout
    });
}

async function fetchAllSkus(client) {
    let allSkus = [];
    let hasNextPage = true;
    let cursor = null;
    let pageCount = 0;

    log('Starting to fetch all SKUs from source store...');

    while (hasNextPage) {
        pageCount++;
        const query = `
            query getProductVariants($after: String) {
                productVariants(first: 250, after: $after) {
                    edges {
                        node {
                            sku
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                    }
                }
            }
        `;
        
        try {
            const response = await client.post('', {
                query,
                variables: { after: cursor }
            });
            
            const edges = response.data.data.productVariants.edges;
            const newSkus = edges.map(edge => edge.node.sku).filter(Boolean);
            allSkus = allSkus.concat(newSkus);
            
            hasNextPage = response.data.data.productVariants.pageInfo.hasNextPage;
            cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
            
            log(`Fetched page ${pageCount}: ${newSkus.length} SKUs (total: ${allSkus.length})`);
            
            // Rate limiting
            if (hasNextPage) {
                await delay(500);
            }
        } catch (error) {
            log(`Error fetching page ${pageCount}: ${error.message}`, 'error');
            throw error;
        }
    }
    
    log(`Completed fetching SKUs. Total: ${allSkus.length}`);
    return allSkus;
}

async function getProductVariantAndInventoryItemIdAndLevels(client, sku) {
    try {
        const response = await client.post('', {
            query: GET_PRODUCT_BY_SKU_WITH_LEVELS,
            variables: { sku: `sku:${sku}` }
        });
        
        // Check if response has the expected structure
        if (!response.data || !response.data.data) {
            log(`Invalid API response for SKU ${sku}: ${JSON.stringify(response.data)}`, 'error');
            return null;
        }
        
        // Check if productVariants exists
        if (!response.data.data.productVariants) {
            log(`No productVariants in response for SKU ${sku}: ${JSON.stringify(response.data.data)}`, 'error');
            return null;
        }
        
        const variant = response.data.data.productVariants.edges[0]?.node;
        if (!variant) {
            log(`No variant found for SKU: ${sku}`, 'warn');
            return null;
        }
        
        // Check if inventoryItem exists
        if (!variant.inventoryItem) {
            log(`No inventory item for SKU ${sku}`, 'warn');
            return null;
        }
        
        return {
            variantId: variant.id,
            inventoryItemId: variant.inventoryItem.id,
            inventoryLevels: variant.inventoryItem.inventoryLevels.edges.map(e => e.node)
        };
    } catch (error) {
        // Handle different types of errors
        if (error.response) {
            // API error with response
            log(`API error for SKU ${sku}: ${error.response.status} - ${error.response.statusText}`, 'error');
            if (error.response.data) {
                log(`API error details: ${JSON.stringify(error.response.data)}`, 'error');
            }
        } else if (error.request) {
            // Network error
            log(`Network error for SKU ${sku}: ${error.message}`, 'error');
        } else {
            // Other error
            log(`Error getting product variant for SKU ${sku}: ${error.message}`, 'error');
        }
        
        // Return null instead of throwing to allow graceful handling
        return null;
    }
}



async function syncInventory(sku, sourceClient, targetClient, targetLocationId, globalConfig = null) {
    return retryWithBackoff(async () => {
        
        // Get source inventory item and levels
        const sourceVariant = await getProductVariantAndInventoryItemIdAndLevels(sourceClient, sku);
        if (!sourceVariant) {
            return { status: 'source_not_found', sku };
        }
        
        // Find the inventory level with available quantity for the source SKU
        const sourceLevel = sourceVariant.inventoryLevels.find(l => {
            const availableObj = l.quantities.find(q => q.name === "available");
            return availableObj !== undefined;
        });
        
        if (!sourceLevel) {
            return { status: 'source_no_inventory', sku };
        }
        
        const sourceAvailable = sourceLevel.quantities.find(q => q.name === "available").quantity;
        
        // Get target inventory item and levels
        const targetVariant = await getProductVariantAndInventoryItemIdAndLevels(targetClient, sku);
        if (!targetVariant) {
            return { status: 'target_not_found', sku, sourceQuantity: sourceAvailable };
        }
        
        // Find the inventory level for the target location
        const targetLevel = targetVariant.inventoryLevels.find(l => l.location.id === targetLocationId);
        if (!targetLevel) {
            return { status: 'target_location_not_found', sku, sourceQuantity: sourceAvailable };
        }
        
        const targetAvailable = targetLevel.quantities.find(q => q.name === "available")?.quantity ?? 0;
        
        // Log the comparison for debugging
        log(`Comparing inventory for ${sku}: source=${sourceAvailable}, target=${targetAvailable}`, 'debug');
        
        // Check if update is needed
        if (sourceAvailable === targetAvailable) {
            return { status: 'no_update_needed', sku, quantity: sourceAvailable };
        }
        
        // Log that we're attempting an update
        log(`Attempting to update ${sku} from ${targetAvailable} to ${sourceAvailable}`, 'debug');
        
        // Update target inventory to match source using inventorySetQuantities
        const success = await updateTargetInventory(targetClient, targetVariant.inventoryItemId, targetLocationId, sourceAvailable);
        
        if (success) {
            return { status: 'updated', sku, oldQuantity: targetAvailable, newQuantity: sourceAvailable };
        } else {
            log(`Update failed for ${sku}: API call returned false`, 'error');
            return { status: 'update_failed', sku, sourceQuantity: sourceAvailable, targetQuantity: targetAvailable };
        }
    }, null, 1000, globalConfig);
}

async function updateTargetInventory(client, inventoryItemId, locationId, newQuantity) {
    try {
        log(`Making API call to update inventory: item=${inventoryItemId}, location=${locationId}, quantity=${newQuantity}`, 'debug');
        
        const response = await client.post('', {
            query: SET_INVENTORY_QUANTITIES,
            variables: {
                input: {
                    name: "available",
                    reason: "correction",
                    ignoreCompareQuantity: true,
                    quantities: [
                        {
                            inventoryItemId,
                            locationId,
                            quantity: newQuantity
                        }
                    ]
                }
            }
        });
        
        // Log the full response for debugging
        log(`API Response for ${inventoryItemId}: ${JSON.stringify(response.data, null, 2)}`, 'debug');
        
        if (response.data.data.inventorySetQuantities.userErrors.length > 0) {
            const errors = response.data.data.inventorySetQuantities.userErrors;
            log(`Error setting inventory for item ${inventoryItemId} at location ${locationId}: ${JSON.stringify(errors)}`, 'error');
            return false;
        }
        
        // Log successful update for debugging
        log(`Successfully updated inventory for item ${inventoryItemId} at location ${locationId} to quantity ${newQuantity}`, 'debug');
        return true;
    } catch (error) {
        log(`Error setting target inventory for item ${inventoryItemId} at location ${locationId}: ${error.response?.data || error.message}`, 'error');
        
        // Log additional error details if available
        if (error.response?.data) {
            log(`Full error response: ${JSON.stringify(error.response.data, null, 2)}`, 'error');
        }
        
        if (error.response?.status) {
            log(`HTTP Status: ${error.response.status}`, 'error');
        }
        
        return false;
    }
}

// Main function
async function main(args) {
    const startTime = Date.now();
    
    try {
        log('Starting Nationwide Plants inventory sync...');
        
        // Load and validate configuration
        const retailerConfig = await loadRetailerConfig();
        log(`Loaded configuration for retailer: ${retailerConfig.name}`);
        
        // Validate target location ID from config
        if (!retailerConfig.targetLocationId) {
            throw new Error('Missing targetLocationId in retailer configuration');
        }
        log(`Using target location ID: ${retailerConfig.targetLocationId}`);
        
        // Load global config and validate tokens
        const globalConfig = loadGlobalConfig();
        const sourceStoreConfig = getSourceStoreConfig(globalConfig);
        const targetStoreConfig = getTargetStoreConfig(retailerConfig);

        if (!sourceStoreConfig.accessToken) {
            throw new Error('Missing source store API token (SHOPIFY_LGL_TOKEN or database token)');
        }
        if (!targetStoreConfig.accessToken) {
            throw new Error('Missing target store API token (SHOPIFY_NATIONWIDE_PLANTS_TOKEN or database token)');
        }
        
        log(`Using source store: ${sourceStoreConfig.url}`);
        log(`Using target store: ${targetStoreConfig.url}`);
        
        const sourceClient = getShopifyClient(sourceStoreConfig);
        const targetClient = getShopifyClient(targetStoreConfig);
        
        // Fetch all SKUs
        log('Fetching all SKUs from source store...');
        const skus = await fetchAllSkus(sourceClient);
        log(`Found ${skus.length} SKUs. Starting batch sync...`);
        
        // Load global config for testing settings
        const BATCH_SIZE = globalConfig?.inventory?.batchSize || 5;
        const DELAY_BETWEEN_BATCHES = globalConfig?.inventory?.delayBetweenBatches || 3000;
        const MAX_RETRIES = globalConfig?.inventory?.maxRetries || 3;
        
        log(`Using batch size: ${BATCH_SIZE}, delay: ${DELAY_BETWEEN_BATCHES}ms, max retries: ${MAX_RETRIES}`);
        const results = {
            total: skus.length,
            processed: 0,
            successful: 0,
            failed: 0,
            updated: 0,
            noUpdateNeeded: 0,
            sourceNotFound: 0,
            targetNotFound: 0,
            targetLocationNotFound: 0,
            sourceNoInventory: 0,
            updateFailed: 0,
            errors: []
        };
        
        for (let i = 0; i < skus.length; i += BATCH_SIZE) {
            const batch = skus.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i/BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(skus.length/BATCH_SIZE);
            
            log(`Processing batch ${batchNumber} of ${totalBatches} (${batch.length} SKUs)`);
            
            try {
                const batchResults = await Promise.allSettled(
                    batch.map(sku => syncInventory(sku, sourceClient, targetClient, retailerConfig.targetLocationId, globalConfig))
                );
                
                batchResults.forEach((result, index) => {
                    const sku = batch[index];
                    if (result.status === 'fulfilled') {
                        const value = result.value;
                        switch (value.status) {
                            case 'updated':
                                results.updated++;
                                results.successful++;
                                log(`✅ Updated SKU: ${sku} (${value.oldQuantity} → ${value.newQuantity})`);
                                break;
                            case 'no_update_needed':
                                results.noUpdateNeeded++;
                                results.successful++;
                                log(`⏭️  No update needed: ${sku} (${value.quantity})`);
                                break;
                            case 'source_not_found':
                                results.sourceNotFound++;
                                results.failed++;
                                log(`❌ Source not found: ${sku}`);
                                break;
                            case 'target_not_found':
                                results.targetNotFound++;
                                results.failed++;
                                log(`❌ Target not found: ${sku} (source had ${value.sourceQuantity})`);
                                break;
                            case 'target_location_not_found':
                                results.targetLocationNotFound++;
                                results.failed++;
                                log(`❌ Target location not found: ${sku}`);
                                break;
                            case 'source_no_inventory':
                                results.sourceNoInventory++;
                                results.failed++;
                                log(`❌ Source no inventory: ${sku}`);
                                break;
                            case 'update_failed':
                                results.updateFailed++;
                                results.failed++;
                                log(`❌ Update failed: ${sku} (source: ${value.sourceQuantity}, target: ${value.targetQuantity})`);
                                break;
                            default:
                                results.failed++;
                                log(`❌ Unknown error: ${sku}`);
                        }
                    } else {
                        results.failed++;
                        const error = result.reason?.message || result.reason || 'Unknown error';
                        results.errors.push({ sku, error });
                        log(`❌ Exception: ${sku} - ${error}`);
                    }
                });
                
                results.processed += batch.length;
                
                log(`Completed batch ${batchNumber}. Success: ${batchResults.filter(r => r.status === 'fulfilled' && r.value.status === 'updated').length}/${batch.length}`);
                
                if (i + BATCH_SIZE < skus.length) {
                    log(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
                    await delay(DELAY_BETWEEN_BATCHES);
                }
            } catch (error) {
                log(`Error processing batch ${batchNumber}: ${error.message}`, 'error');
                results.processed += batch.length;
                results.failed += batch.length;
                results.errors.push({
                    batch: batchNumber,
                    error: error.message
                });
            }
        }
        
        const duration = Date.now() - startTime;
        const durationSeconds = duration / 1000;
        
        log(`\n=== INVENTORY SYNC SUMMARY ===`);
        log(`📊 Total SKUs processed: ${results.processed}`);
        log(`✅ Successfully processed: ${results.successful} (${((results.successful/results.processed)*100).toFixed(1)}%)`);
        log(`❌ Failed: ${results.failed} (${((results.failed/results.processed)*100).toFixed(1)}%)`);
        log(`⏱️  Duration: ${durationSeconds.toFixed(2)} seconds`);
        
        log(`\n📈 Detailed Breakdown:`);
        log(`   🔄 Updated: ${results.updated} SKUs`);
        log(`   ⏭️  No update needed: ${results.noUpdateNeeded} SKUs`);
        log(`   ❌ Source not found: ${results.sourceNotFound} SKUs`);
        log(`   ❌ Target not found: ${results.targetNotFound} SKUs`);
        log(`   ❌ Target location not found: ${results.targetLocationNotFound} SKUs`);
        log(`   ❌ Source no inventory: ${results.sourceNoInventory} SKUs`);
        log(`   ❌ Update failed: ${results.updateFailed} SKUs`);
        
        if (results.errors.length > 0) {
            log(`\n🚨 Top Errors:`);
            const errorCounts = {};
            results.errors.forEach(error => {
                const key = error.error.split(':')[0];
                errorCounts[key] = (errorCounts[key] || 0) + 1;
            });
            
            Object.entries(errorCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .forEach(([error, count]) => {
                    log(`   ${error}: ${count} occurrences`);
                });
        }
        
        // Send email notification
        try {
            const globalConfig = loadGlobalConfig();
            if (globalConfig) {
                const emailNotifier = new DatabaseEmailNotifier(globalConfig);
                
                // Calculate location mismatches from the actual results field
                const locationMismatches = results.targetLocationNotFound || 0;
                const otherFailures = results.failed - locationMismatches;
                
                // Convert results to the format expected by email notifier
                const emailResults = {
                    inventory: {
                        total: results.processed,
                        successfulUpdates: results.successful || results.updated || 0,
                        locationMismatches: locationMismatches,
                        failures: otherFailures,
                        details: {
                            successfulUpdates: (results.successful || results.updated || 0) > 0 ? [{ retailer: 'Nationwide Plants', sku: 'Multiple SKUs' }] : [],
                            locationMismatches: locationMismatches > 0 ? [{ retailer: 'Nationwide Plants', sku: 'Location mapping issues', count: locationMismatches }] : [],
                            failures: results.errors.map(error => ({
                                retailer: 'Nationwide Plants',
                                sku: error.sku || 'Unknown',
                                error: error.error
                            }))
                        }
                    }
                };
                
                log('📧 Sending inventory sync email notification...');
                await emailNotifier.sendInventoryAlert({ inventory: emailResults.inventory });
                log('✅ Email notification sent successfully');
            } else {
                log('⚠️  No global config found, skipping email notification');
            }
        } catch (emailError) {
            log(`❌ Failed to send email notification: ${emailError.message}`, 'error');
        }
        
        return {
            statusCode: 200,
            body: {
                message: 'Nationwide Plants inventory sync completed',
                results,
                duration
            }
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        log(`Error in sync process after ${duration}ms: ${error.message}`, 'error');
        
        // Send error notification email
        try {
            const globalConfig = loadGlobalConfig();
            if (globalConfig) {
                const emailNotifier = new DatabaseEmailNotifier(globalConfig);
                log('📧 Sending error notification email...');
                await emailNotifier.sendErrorNotification(error, {
                    operation: 'inventory',
                    retailer: 'Nationwide Plants'
                });
                log('✅ Error notification email sent successfully');
            } else {
                log('⚠️  No global config found, skipping error email notification');
            }
        } catch (emailError) {
            log(`❌ Failed to send error notification email: ${emailError.message}`, 'error');
        }
        
        return {
            statusCode: 500,
            body: {
                message: 'Error during Nationwide Plants inventory sync',
                error: error.message,
                duration
            }
        };
    }
}

// For local testing
if (require.main === module) {
    main().catch(error => {
        log(`Fatal error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = { main };