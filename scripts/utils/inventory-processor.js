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
    this.logger = new Logger(retailer.id || retailer.name);
  }

  async processInventorySync() {
    this.logger.logInfo('Starting inventory sync process');
    try {
      const skus = await this.fetchAllSkus();
      this.logger.logInfo(`Found ${skus.length} SKUs to sync`);
      
      const results = {
        total: skus.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      const BATCH_SIZE = 10;
      const DELAY_BETWEEN_BATCHES = 2000;

      for (let i = 0; i < skus.length; i += BATCH_SIZE) {
        const batch = skus.slice(i, i + BATCH_SIZE);
        this.logger.logInfo(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(skus.length/BATCH_SIZE)}`);
        
        try {
          await Promise.all(batch.map(sku => this.syncInventory(sku)));
          results.processed += batch.length;
          results.successful += batch.length;
          this.logger.logInfo(`Completed batch ${Math.floor(i/BATCH_SIZE) + 1}`);
          
          if (i + BATCH_SIZE < skus.length) {
            this.logger.logInfo(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
            await this.delay(DELAY_BETWEEN_BATCHES);
          }
        } catch (error) {
          this.logger.logError(`Error processing batch ${Math.floor(i/BATCH_SIZE) + 1}: ${error.message}`);
          results.processed += batch.length;
          results.failed += batch.length;
          results.errors.push({
            batch: Math.floor(i/BATCH_SIZE) + 1,
            error: error.message
          });
        }
      }

      this.logger.logInfo(`Inventory sync completed: ${results.successful} successful, ${results.failed} failed`);
      return results;
    } catch (error) {
      this.logger.logError(`Failed to process inventory sync: ${error.message}`);
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
        this.logger.logInfo('Target inventory already matches source. No update needed.');
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
      
      this.logger.logInfo('Successfully updated inventory.');
      return true;
    } catch (error) {
      this.logger.logError(`Error updating target inventory: ${error.message}`);
      return false;
    }
  }

  async syncInventory(sku) {
    return this.retryWithBackoff(async () => {
      this.logger.logInfo(`Starting inventory sync for SKU: ${sku}`);
      
      // Get source inventory item and levels from LGL store
      const sourceVariant = await this.getProductVariantAndInventoryItemIdAndLevels(this.lglClient, sku);
      if (!sourceVariant) {
        this.logger.logInfo('Failed to get LGL store inventory item');
        return;
      }
      
      // Find the inventory level with available quantity for the LGL store SKU
      const sourceLevel = sourceVariant.inventoryLevels.find(l => {
        const availableObj = l.quantities.find(q => q.name === "available");
        return availableObj !== undefined;
      });
      
      if (!sourceLevel) {
        this.logger.logInfo('Failed to find any inventory level with available quantity for LGL store SKU');
        return;
      }
      
      const sourceAvailable = sourceLevel.quantities.find(q => q.name === "available").quantity;
      const sourceLocationId = sourceLevel.location.id;
      this.logger.logInfo(`LGL store inventory for ${sku}: ${sourceAvailable} at location ${sourceLocationId}`);
      
      // Get target inventory item and levels from retailer store
      const targetVariant = await this.getProductVariantAndInventoryItemIdAndLevels(this.retailClient, sku);
      if (!targetVariant) {
        this.logger.logInfo('Failed to get retailer store inventory item');
        return;
      }
      
      // Debug: Log available locations in retailer store
      this.logger.logInfo(`Available locations in retailer store for SKU ${sku}:`);
      targetVariant.inventoryLevels.forEach(level => {
        this.logger.logInfo(`  - ${level.location.id}: ${level.quantities.find(q => q.name === "available")?.quantity || 0}`);
      });
      
      // Use the first available location in the retailer store
      const targetLevel = targetVariant.inventoryLevels[0];
      if (!targetLevel) {
        this.logger.logInfo('No inventory levels found in retailer store');
        return;
      }
      
      const targetLocationId = targetLevel.location.id;
      const targetAvailable = targetLevel.quantities.find(q => q.name === "available")?.quantity ?? 0;
      this.logger.logInfo(`Using retailer store location: ${targetLocationId} with current quantity: ${targetAvailable}`);
      
      // Update retailer store inventory to match LGL store
      const success = await this.updateTargetInventory(
        targetVariant.inventoryItemId,
        targetLocationId, 
        sourceAvailable, 
        targetAvailable
      );
      
      if (success) {
        this.logger.logInfo(`Successfully synced inventory from LGL store to retailer store for SKU: ${sku}`);
      } else {
        this.logger.logInfo(`Failed to sync inventory from LGL store to retailer store for SKU: ${sku}`);
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