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
    const results = { 
      total: 0, 
      successfulUpdates: 0,
      locationMismatches: 0,
      failures: 0,
      details: {
        successfulUpdates: [],
        locationMismatches: [],
        failures: []
      }
    };
    
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
        
        const batchPromises = batch.map(sku => this.syncInventory(sku));
        const batchResults = await Promise.all(batchPromises);
        
        // Aggregate batch results
        batchResults.forEach(result => {
          if (result) {
            results.total++;
            if (result.type === 'successful_update') {
              results.successfulUpdates++;
              results.details.successfulUpdates.push(result.sku);
              
              // If this was a successful update with location mismatch, also track the mismatch
              if (result.locationMismatch) {
                results.locationMismatches++;
                results.details.locationMismatches.push({
                  sku: result.sku,
                  expectedLocation: result.expectedLocation,
                  actualLocation: result.actualLocation
                });
              }
            } else if (result.type === 'location_mismatch') {
              results.locationMismatches++;
              results.details.locationMismatches.push({
                sku: result.sku,
                expectedLocation: result.expectedLocation,
                actualLocation: result.actualLocation
              });
            } else if (result.type === 'failure') {
              results.failures++;
              results.details.failures.push({
                sku: result.sku,
                error: result.error
              });
            }
          }
        });
        
        if (i + BATCH_SIZE < skus.length) {
          await this.delay(DELAY_BETWEEN_BATCHES);
        }
      }
      
      this.logger.logInfo(`Inventory sync completed. Successful updates: ${results.successfulUpdates}, Location mismatches: ${results.locationMismatches}, Failures: ${results.failures}`);
      return results;
    } catch (error) {
      this.logger.logError(`Error in inventory sync process: ${error.message}`);
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
        return { type: 'failure', sku: sku, error: 'Not found in LGL store' };
      }
      
      // Find the inventory level with available quantity for the LGL store SKU
      const sourceLevel = sourceVariant.inventoryLevels.find(l => {
        const availableObj = l.quantities.find(q => q.name === "available");
        return availableObj !== undefined;
      });
      
      if (!sourceLevel) {
        this.logger.logInfo(`❌ SKU ${sku}: No available inventory in LGL store`);
        return { type: 'failure', sku: sku, error: 'No available inventory in LGL store' };
      }
      
      const sourceAvailable = sourceLevel.quantities.find(q => q.name === "available").quantity;
      this.logger.logInfo(`📦 SKU ${sku}: LGL Store Quantity: ${sourceAvailable}`);
      
      // Get target inventory item and levels from retailer store
      const targetVariant = await this.getProductVariantAndInventoryItemIdAndLevels(this.retailClient, sku);
      if (!targetVariant) {
        this.logger.logInfo(`❌ SKU ${sku}: Not found in retailer store`);
        return { type: 'failure', sku: sku, error: 'Not found in retailer store' };
      }
      
      // Use the first available location in the retailer store
      const targetLevel = targetVariant.inventoryLevels[0];
      if (!targetLevel) {
        this.logger.logInfo(`❌ SKU ${sku}: No inventory levels in retailer store`);
        return { type: 'failure', sku: sku, error: 'No inventory levels in retailer store' };
      }
      
      const targetLocationId = targetLevel.location.id;
      const targetAvailable = targetLevel.quantities.find(q => q.name === "available")?.quantity ?? 0;
      const expectedRetailerLocationId = this.retailer.targetLocationId;
      
      this.logger.logInfo(`🏪 SKU ${sku}: Retailer Store Quantity: ${targetAvailable}`);
      this.logger.logInfo(`📍 SKU ${sku}: Retailer Location: ${targetLocationId}`);
      this.logger.logInfo(`🎯 SKU ${sku}: Expected Location: ${expectedRetailerLocationId}`);
      
      // Check if the SKU is in the correct location within the retailer store
      // Use the retailer's configured targetLocationId instead of comparing with LGL store location
      if (targetLocationId !== expectedRetailerLocationId) {
        this.logger.logInfo(`⚠️ SKU ${sku}: Location mismatch in retailer store - Expected: ${expectedRetailerLocationId}, Actual: ${targetLocationId}`);
        this.logger.logInfo(`📊 SKU ${sku}: Quantity comparison: ${targetAvailable} (retailer) vs ${sourceAvailable} (LGL)`);
        this.logger.logInfo(`🔄 SKU ${sku}: Would update to: ${sourceAvailable} (if location was correct)`);
        return { 
          type: 'location_mismatch', 
          sku: sku, 
          expectedLocation: expectedRetailerLocationId, 
          actualLocation: targetLocationId 
        };
      }
      
      this.logger.logInfo(`✅ SKU ${sku}: Location match - SKU in correct location`);
      this.logger.logInfo(`📊 SKU ${sku}: Quantity comparison: ${targetAvailable} (retailer) vs ${sourceAvailable} (LGL)`);
      
      // Update retailer store inventory to match LGL store
      const success = await this.updateTargetInventory(
        targetVariant.inventoryItemId,
        targetLocationId, 
        sourceAvailable, 
        targetAvailable
      );
      
      if (success) {
        if (sourceAvailable !== targetAvailable) {
          this.logger.logInfo(`🔄 SKU ${sku}: UPDATE NEEDED: ${targetAvailable} → ${sourceAvailable}`);
          this.logger.logInfo(`✅ SKU ${sku}: Updated ${targetAvailable} → ${sourceAvailable}`);
          return { type: 'successful_update', sku: sku };
        } else {
          this.logger.logInfo(`✅ SKU ${sku}: Quantities match - no update needed`);
          return { type: 'successful_update', sku: sku };
        }
      } else {
        this.logger.logInfo(`❌ SKU ${sku}: Failed to update inventory`);
        return { type: 'failure', sku: sku, error: 'Failed to update inventory' };
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
}

module.exports = { InventoryProcessor }; 