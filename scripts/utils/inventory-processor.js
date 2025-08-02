const { ShopifyClient } = require('./shopify-client');
const { Logger } = require('./logger');

class InventoryProcessor {
  constructor(retailer, config) {
    this.retailer = retailer;
    this.config = config;
    // Retail store (source) - where we read inventory from
    this.retailClient = new ShopifyClient(retailer.domain, retailer.apiToken);
    // LGL store (target) - where we update inventory to
    this.lglClient = new ShopifyClient(config.lglStore.domain, config.lglStore.apiToken);
    this.logger = new Logger(retailer.id || retailer.name, config);
  }

  async processInventorySync() {
    this.logger.logInfo('Starting inventory sync process');
    const results = { total: 0, success: [], errors: [] };
    
    try {
      const skus = await this.fetchAllSkus();
      this.logger.logInfo(`Found ${skus.length} SKUs to sync`);
      
      const BATCH_SIZE = 25; // Increased from 10
      const DELAY_BETWEEN_BATCHES = 500; // Reduced from 2000ms

      for (let i = 0; i < skus.length; i += BATCH_SIZE) {
        const batch = skus.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i/BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(skus.length/BATCH_SIZE);
        this.logger.logInfo(`Processing batch ${batchNum}/${totalBatches} (${batch.length} SKUs)`);
        
        try {
          await Promise.all(batch.map(sku => this.syncInventory(sku)));
          batch.forEach(sku => {
            results.success.push(`Synced inventory for SKU: ${sku}`);
            results.total++; // Only increment total for successfully processed SKUs
          });
          this.logger.logInfo(`✅ Completed batch ${batchNum}/${totalBatches}`);
          
          if (i + BATCH_SIZE < skus.length) {
            this.logger.logInfo(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
            await this.delay(DELAY_BETWEEN_BATCHES);
          }
        } catch (error) {
          this.logger.logError(`❌ Error processing batch ${batchNum}: ${error.message}`);
          batch.forEach(sku => {
            results.errors.push(`Failed to sync inventory for SKU ${sku}: ${error.message}`);
            // Don't increment total for failed SKUs - only count successful ones
          });
        }
      }

      this.logger.logInfo(`🎉 Inventory sync completed: ${results.success.length} successful, ${results.errors.length} failed`);
      return results;
    } catch (error) {
      this.logger.logError(`Failed to process inventory sync: ${error.message}`, 'error', error);
      throw error;
    }
  }

  // New bulk sync method for better efficiency
  async processBulkInventorySync() {
    this.logger.logInfo('🚀 Starting bulk inventory sync process');
    this.logger.logInfo(`📍 Target location: ${this.retailer.targetLocationId}`);
    const results = { total: 0, success: [], errors: [], audit: { wrongLocation: [] }, checked: [] };
    
    try {
      // Step 1: Get SKUs to sync (either all or test SKUs)
      let skus;
      if (process.env.TEST_SKUS) {
        // Test mode: use specific SKUs for testing
        skus = process.env.TEST_SKUS.split(',').map(sku => sku.trim());
        this.logger.logInfo(`🧪 TEST MODE: Using ${skus.length} test SKUs`);
      } else {
        // Production mode: get all SKUs from retailer store
        skus = await this.fetchAllSkus();
        this.logger.logInfo(`📦 Found ${skus.length} SKUs to sync`);
      }
      
      // Step 2: Bulk fetch all LGL inventory in one query
      this.logger.logInfo('🔍 Fetching LGL inventory data...');
      const lglInventory = await this.bulkFetchInventory(this.lglClient, skus);
      
      // Step 3: Bulk fetch all retailer inventory in one query  
      this.logger.logInfo('🏪 Fetching retailer inventory data...');
      const retailerInventory = await this.bulkFetchInventory(this.retailClient, skus);
      
      // If bulk fetch didn't work, try individual queries for test mode
      if (process.env.TEST_SKUS && (Object.keys(lglInventory).length === 0 || Object.keys(retailerInventory).length === 0)) {
        this.logger.logInfo('⚠️  Bulk query returned no results, trying individual SKU queries...');
        const lglInventoryIndividual = {};
        const retailerInventoryIndividual = {};
        
        for (const sku of skus) {
          // Get LGL inventory for this SKU
          const lglVariant = await this.getProductVariantAndInventoryItemIdAndLevels(this.lglClient, sku);
          if (lglVariant && lglVariant.inventoryLevels.length > 0) {
            const level = lglVariant.inventoryLevels[0];
            const available = level.quantities.find(q => q.name === "available");
            lglInventoryIndividual[sku] = {
              inventoryItemId: lglVariant.inventoryItemId,
              locationId: level.location.id,
              quantity: available ? available.quantity : 0
            };
          }
          
          // Get retailer inventory for this SKU
          const retailerVariant = await this.getProductVariantAndInventoryItemIdAndLevels(this.retailClient, sku);
          if (retailerVariant && retailerVariant.inventoryLevels.length > 0) {
            const targetLocationId = this.retailer.targetLocationId;
            const targetLevel = retailerVariant.inventoryLevels.find(l => l.location.id === targetLocationId);
            if (targetLevel) {
              const available = targetLevel.quantities.find(q => q.name === "available");
              retailerInventoryIndividual[sku] = {
                inventoryItemId: retailerVariant.inventoryItemId,
                locationId: targetLevel.location.id,
                quantity: available ? available.quantity : 0
              };
            } else {
              // SKU exists but not in target location - add to audit
              const otherLevels = retailerVariant.inventoryLevels.filter(l => l.location.id !== targetLocationId);
              if (otherLevels.length > 0) {
                results.audit.wrongLocation.push({
                  sku,
                  currentLocation: otherLevels[0].location.id,
                  currentQuantity: otherLevels[0].quantities.find(q => q.name === "available")?.quantity || 0,
                  targetLocation: targetLocationId
                });
              }
            }
          }
        }
        
        // Use individual results if bulk failed
        if (Object.keys(lglInventoryIndividual).length > 0) {
          Object.assign(lglInventory, lglInventoryIndividual);
        }
        if (Object.keys(retailerInventoryIndividual).length > 0) {
          Object.assign(retailerInventory, retailerInventoryIndividual);
        }
      }
      
      // Step 4: Prepare bulk updates
      this.logger.logInfo('⚙️  Preparing inventory updates...');
      const updates = this.prepareBulkUpdates(lglInventory, retailerInventory);
      
      // Track SKUs that were checked but didn't need updates
      for (const sku in retailerInventory) {
        const lglData = lglInventory[sku];
        const retailerData = retailerInventory[sku];
        
        if (lglData && retailerData) {
          if (lglData.quantity === retailerData.quantity) {
            // SKU was checked but quantities already matched
            results.checked.push({
              sku,
              lglQuantity: lglData.quantity,
              retailerQuantity: retailerData.quantity
            });
          }
        }
      }
      
      if (updates.length > 0) {
        this.logger.logInfo(`🔄 Found ${updates.length} SKUs that need inventory updates`);
        
        // Step 5: Execute bulk updates
        this.logger.logInfo('📤 Executing inventory updates...');
        const updateResults = await this.executeBulkUpdates(updates);
        
        results.success = updateResults.success;
        results.errors = updateResults.errors;
        results.total = updates.length;
      } else {
        this.logger.logInfo('✅ All SKUs already have matching inventory levels');
        results.total = Object.keys(retailerInventory).length;
      }
      
      // Add audit results
      if (results.audit.wrongLocation.length > 0) {
        this.logger.logInfo(`⚠️  Found ${results.audit.wrongLocation.length} SKUs in wrong location`);
      }
      
      this.logger.logInfo(`🎉 Inventory sync completed: ${results.success.length} updated, ${results.errors.length} failed, ${results.audit.wrongLocation.length} in wrong location, ${results.checked.length} already matched`);
      return results;
    } catch (error) {
      this.logger.logError(`❌ Failed to process bulk inventory sync: ${error.message}`, 'error', error);
      throw error;
    }
  }

  async fetchAllSkus() {
    let allSkus = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
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
      
      const data = await this.retailClient.graphql(query, { after: cursor });
      const edges = data.productVariants.edges;
      allSkus = allSkus.concat(edges.map(edge => edge.node.sku).filter(Boolean));
      hasNextPage = data.productVariants.pageInfo.hasNextPage;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
    }
    
    return allSkus;
  }

  async getProductVariantAndInventoryItemIdAndLevels(client, sku) {
    const query = `
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
    
    const data = await client.graphql(query, { sku: `sku:${sku}` });
    const variant = data.productVariants.edges[0]?.node;
    if (!variant) return null;
    
    return {
      variantId: variant.id,
      inventoryItemId: variant.inventoryItem.id,
      inventoryLevels: variant.inventoryItem.inventoryLevels.edges.map(e => e.node)
    };
  }

  async updateTargetInventory(inventoryItemId, locationId, newQuantity, currentQuantity) {
    try {
      const delta = newQuantity - currentQuantity;
      if (delta === 0) {
        // Don't log when no change is needed to reduce noise
        return true;
      }
      
      const mutation = `
        mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
          inventoryAdjustQuantities(input: $input) {
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      const variables = {
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
      };
      
      const result = await this.retailClient.graphql(mutation, variables);
      
      if (result.inventoryAdjustQuantities.userErrors.length > 0) {
        this.logger.logError(`Error updating inventory: ${JSON.stringify(result.inventoryAdjustQuantities.userErrors)}`);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.logError(`Error updating target inventory: ${error.message}`);
      return false;
    }
  }

  async syncInventory(sku) {
    return this.retryWithBackoff(async () => {
      // Get source inventory item and levels from LGL store
      const sourceVariant = await this.getProductVariantAndInventoryItemIdAndLevels(this.lglClient, sku);
      if (!sourceVariant) {
        this.logger.logInfo(`❌ SKU ${sku}: Not found in LGL store`);
        return;
      }
      
      // Find the inventory level with available quantity for the LGL store SKU
      const sourceLevel = sourceVariant.inventoryLevels.find(l => {
        const availableObj = l.quantities.find(q => q.name === "available");
        return availableObj !== undefined;
      });
      
      if (!sourceLevel) {
        this.logger.logInfo(`❌ SKU ${sku}: No available inventory in LGL store`);
        return;
      }
      
      const sourceAvailable = sourceLevel.quantities.find(q => q.name === "available").quantity;
      
      // Get target inventory item and levels from retailer store
      const targetVariant = await this.getProductVariantAndInventoryItemIdAndLevels(this.retailClient, sku);
      if (!targetVariant) {
        this.logger.logInfo(`❌ SKU ${sku}: Not found in retailer store`);
        return;
      }
      
      // Find the specific target location configured in retailer settings
      const targetLocationId = this.retailer.targetLocationId;
      const targetLevel = targetVariant.inventoryLevels.find(l => l.location.id === targetLocationId);
      
      if (!targetLevel) {
        this.logger.logInfo(`❌ SKU ${sku}: Target location ${targetLocationId} not found in retailer store`);
        return;
      }
      
      const targetAvailable = targetLevel.quantities.find(q => q.name === "available")?.quantity ?? 0;
      
      // Update retailer store inventory to match LGL store
      const success = await this.updateTargetInventory(
        targetVariant.inventoryItemId,
        targetLocationId, 
        sourceAvailable, 
        targetAvailable
      );
      
      if (success) {
        if (sourceAvailable !== targetAvailable) {
          this.logger.logInfo(`✅ SKU ${sku}: Updated ${targetAvailable} → ${sourceAvailable}`);
        }
        // Don't log when quantities already match to reduce noise
      } else {
        this.logger.logInfo(`❌ SKU ${sku}: Failed to update inventory`);
      }
    });
  }

  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let retries = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        if (retries >= maxRetries) {
          throw error;
        }
        const delayMs = initialDelay * Math.pow(2, retries);
        this.logger.logInfo(`Retry attempt ${retries + 1} after ${delayMs}ms delay`);
        await this.delay(delayMs);
        retries++;
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async bulkFetchInventory(client, skus) {
    const inventory = {};
    const BATCH_SIZE = 100; // Process SKUs in batches for the query
    
    // Get the target location ID from retailer config
    const targetLocationId = this.retailer.targetLocationId;
    
    for (let i = 0; i < skus.length; i += BATCH_SIZE) {
      const batch = skus.slice(i, i + BATCH_SIZE);
      const query = `
        query getBulkInventory {
          productVariants(first: 250, query: "sku:(${batch.join(' OR ')})\") {
            edges {
              node {
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
      
      try {
        const response = await client.request(query);
        const variants = response.productVariants?.edges || [];
        
        for (const edge of variants) {
          const variant = edge.node;
          const sku = variant.sku;
          const inventoryItem = variant.inventoryItem;
          
          if (inventoryItem && inventoryItem.inventoryLevels?.edges?.length > 0) {
            const level = inventoryItem.inventoryLevels.edges[0].node;
            const available = level.quantities.find(q => q.name === "available");
            
            inventory[sku] = {
              inventoryItemId: inventoryItem.id,
              locationId: level.location.id,
              quantity: available ? available.quantity : 0
            };
          }
        }
      } catch (error) {
        this.logger.logError(`Error in bulk inventory fetch: ${error.message}`);
      }
    }
    
    return inventory;
  }

  prepareBulkUpdates(lglInventory, retailerInventory) {
    const updates = [];
    
    for (const sku in retailerInventory) {
      const lglData = lglInventory[sku];
      const retailerData = retailerInventory[sku];
      
      if (lglData && retailerData) {
        const lglQuantity = lglData.quantity;
        const retailerQuantity = retailerData.quantity;
        
        if (lglQuantity !== retailerQuantity) {
          updates.push({
            sku,
            inventoryItemId: retailerData.inventoryItemId,
            locationId: retailerData.locationId,
            currentQuantity: retailerQuantity,
            newQuantity: lglQuantity,
            delta: lglQuantity - retailerQuantity
          });
        }
      }
    }
    
    return updates;
  }

  async executeBulkUpdates(updates) {
    const results = { success: [], errors: [] };
    const BATCH_SIZE = 50; // Shopify bulk mutation limit
    
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i/BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(updates.length/BATCH_SIZE);
      
      this.logger.logInfo(`Processing bulk update batch ${batchNum}/${totalBatches} (${batch.length} updates)`);
      
      try {
        const mutation = `
          mutation bulkInventoryAdjust($input: [InventoryAdjustQuantitiesInput!]!) {
            bulkInventoryAdjust(input: $input) {
              inventoryAdjustments {
                inventoryItemId
                locationId
                quantities {
                  name
                  quantity
                }
                userErrors {
                  field
                  message
                }
              }
            }
          }
        `;
        
        const variables = {
          input: batch.map(update => ({
            reason: "correction",
            name: "available",
            changes: [{
              inventoryItemId: update.inventoryItemId,
              locationId: update.locationId,
              delta: update.newQuantity - update.currentQuantity
            }]
          }))
        };
        
        const result = await this.retailClient.graphql(mutation, variables);
        
        // Process results
        result.bulkInventoryAdjust.inventoryAdjustments.forEach((adjustment, index) => {
          const update = batch[index];
          if (adjustment.userErrors.length > 0) {
            results.errors.push(`Failed to sync SKU ${update.sku}: ${adjustment.userErrors[0].message}`);
          } else {
            results.success.push(update.sku);
          }
        });
        
        // Add delay between batches to respect rate limits
        if (i + BATCH_SIZE < updates.length) {
          await this.delay(200); // Shorter delay for bulk operations
        }
      } catch (error) {
        this.logger.logError(`❌ Error processing bulk update batch ${batchNum}: ${error.message}`);
        batch.forEach(update => {
          results.errors.push(`Failed to sync SKU ${update.sku}: ${error.message}`);
        });
      }
    }
    
    return results;
  }
}

module.exports = { InventoryProcessor }; 