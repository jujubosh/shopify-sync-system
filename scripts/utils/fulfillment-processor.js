const { ShopifyClient } = require('./shopify-client');
const { Logger } = require('./logger');
const { QUERIES, buildFulfillmentInput, addTags } = require('./graphql-queries');
const fs = require('fs');
const path = require('path');

class FulfillmentProcessor {
  constructor(retailer, config) {
    this.retailer = retailer;
    this.config = config;
    
    // Load API configuration
    const apiConfigPath = path.join(__dirname, '../../config/shopify-api-config.json');
    const apiConfig = JSON.parse(fs.readFileSync(apiConfigPath, 'utf8'));
    
    // LGL store (source) - where fulfillments are created
    this.lglClient = new ShopifyClient(config.lglStore.domain, config.lglStore.apiToken, apiConfig);
    // Retail store (target) - where fulfillments are pushed back to
    this.retailClient = new ShopifyClient(retailer.domain, retailer.apiToken, apiConfig);
    this.logger = new Logger(retailer.id || retailer.name, config);
  }

  async processFulfillments() {
    this.logger.logInfo('Starting fulfillment pushback process');
    const results = { total: 0, success: [], errors: [], skipped: [] };
    
    try {
      const orders = await this.getFulfilledTargetOrders();
      this.logger.logInfo(`Found ${orders.length} fulfilled orders to push back`);
      
      for (const order of orders) {
        try {
          this.logger.logInfo(`Processing fulfillment for target order ${order.name}`);
          await this.pushFulfillmentToSource(order);
          await this.tagTargetOrder(order.id, 'fulfillment-pushed');
          this.logger.logInfo(`Successfully pushed fulfillment for target order ${order.name}`);
          results.success.push(`Pushed fulfillment for order ${order.name}`);
          results.total++; // Only increment total for successfully processed orders
        } catch (error) {
          // Check if this is an "already fulfilled" scenario
          if (error.message.includes('already fulfilled') || error.message.includes('All items')) {
            this.logger.logInfo(`Skipping ${order.name}: items already fulfilled`);
            await this.tagTargetOrder(order.id, 'fulfillment-pushed');
            results.skipped.push(`Skipped fulfillment for order ${order.name}: already fulfilled`);
            results.total++; // Count as successful since we handled it properly
          } else {
            this.logger.logError(`Failed to push fulfillment for target order ${order.name}: ${error.message}`, 'error', error);
            results.errors.push(`Failed to push fulfillment for order ${order.name}: ${error.message}`);
            // Don't increment total for failed orders - only count successful ones
          }
        }
      }
      
      this.logger.logInfo(`Fulfillment processing complete: ${results.total} processed, ${results.success.length} successful, ${results.skipped.length} skipped, ${results.errors.length} failed`);
      
      return results;
    } catch (error) {
      this.logger.logError(`Failed to process fulfillments: ${error.message}`, 'error', error);
      throw error;
    }
  }

  async getFulfilledTargetOrders() {
    // Use GraphQL instead of REST API
    const variables = {
      first: 100
    };
    
    try {
      const data = await this.lglClient.graphql(QUERIES.getFulfilledOrders, variables);
      const orders = [];
      
      this.logger.logInfo(`Found ${data.orders.edges.length} orders from GraphQL query`);
      
      for (const edge of data.orders.edges) {
        const order = edge.node;
        this.logger.logInfo(`Processing order ${order.name}`);
        
        // Only process if not already pushed
        if (order.tags.includes('fulfillment-pushed')) {
          this.logger.logInfo(`Skipping ${order.name}: already pushed`);
          continue;
        }
        
        // Must have an 'imported-from-...' tag and a numeric order number tag
        // Handle tags as either array (from GraphQL) or string (from REST)
        const tags = Array.isArray(order.tags) ? order.tags : (order.tags ? order.tags.split(',').map(tag => tag.trim()) : []);
        const importedFromTag = tags.find(tag => tag.startsWith('imported-from-'));
        const orderNumberTag = tags.find(tag => /^\d+$/.test(tag));
        
        if (!importedFromTag || !orderNumberTag) {
          this.logger.logInfo(`Skipping ${order.name}: missing required tags (imported-from: ${!!importedFromTag}, order number: ${!!orderNumberTag})`);
          continue;
        }
        
        // Extract source info using tags
        const { sourceOrderNumber, sourceStoreName } = this.extractSourceInfoFromTags(tags);
        if (!sourceOrderNumber || !sourceStoreName) {
          this.logger.logInfo(`Skipping ${order.name}: could not extract source info (orderNumber: ${sourceOrderNumber}, storeName: ${sourceStoreName})`);
          continue;
        }
        
        // Only process orders that were imported from the current retailer
        const currentRetailerName = this.retailer.name.replace(/\s+/g, '-').toLowerCase();
        if (sourceStoreName !== currentRetailerName) {
          this.logger.logInfo(`Skipping ${order.name}: imported from ${sourceStoreName}, but processing for ${currentRetailerName}`);
          continue;
        }
        
        this.logger.logInfo(`Adding ${order.name} to processing queue (source: ${sourceOrderNumber}, store: ${sourceStoreName})`);
        orders.push({ ...order, sourceOrderNumber, sourceStoreName });
      }
      
      return orders;
    } catch (error) {
      this.logger.logError(`Failed to get fulfilled orders: ${error.message}`);
      throw error;
    }
  }

  extractSourceInfoFromTags(tags) {
    // Find a tag that starts with 'imported-from-' (lowercase with hyphens)
    const importedFromTag = tags.find(tag => tag.startsWith('imported-from-'));
    let sourceStoreName = importedFromTag ? importedFromTag.replace('imported-from-', '') : null;

    // Find the original order number tag (numeric tag)
    const sourceOrderNumber = tags.find(tag => /^\d+$/.test(tag));
    
    return { sourceOrderNumber, sourceStoreName };
  }

  async pushFulfillmentToSource(order) {
    // Find the source order by order number and get fulfillmentOrders
    const query = `
      query getSourceOrder($name: String!) {
        orders(first: 1, query: $name) {
          edges {
            node {
              id
              name
              fulfillmentOrders(first: 5) {
                edges {
                  node {
                    id
                    assignedLocation {
                      location {
                        id
                      }
                    }
                    lineItems(first: 10) {
                      edges {
                        node {
                          id
                          lineItem {
                            id
                            sku
                            quantity
                          }
                          remainingQuantity
                        }
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
    
    const data = await this.retailClient.graphql(query, { name: order.sourceOrderNumber });
    if (!data.orders.edges.length) {
      throw new Error(`Source order not found: ${order.sourceOrderNumber}`);
    }
    
    const sourceOrder = data.orders.edges[0].node;
    const locationGid = `gid://shopify/Location/${this.retailer.lglLocationId}`;

    // Filter fulfillmentOrders by assigned location
    const fulfillmentOrdersToFulfill = sourceOrder.fulfillmentOrders.edges.filter(
      edge => edge.node.assignedLocation && edge.node.assignedLocation.location && edge.node.assignedLocation.location.id === locationGid
    );
    
    if (!fulfillmentOrdersToFulfill.length) {
      throw new Error('No fulfillmentOrder for correct location on source order');
    }

    // Build lineItemsByFulfillmentOrder input - only include items with remainingQuantity > 0
    const lineItemsByFulfillmentOrder = fulfillmentOrdersToFulfill.map(edge => {
      const fulfillmentOrder = edge.node;
      const lineItemsWithRemainingQuantity = fulfillmentOrder.lineItems.edges
        .filter(itemEdge => itemEdge.node.remainingQuantity > 0)
        .map(itemEdge => ({
          id: itemEdge.node.id,
          quantity: itemEdge.node.remainingQuantity
        }));
      
      // Only include fulfillment orders that have items with remaining quantity
      if (lineItemsWithRemainingQuantity.length === 0) {
        return null;
      }
      
      return {
        fulfillmentOrderId: fulfillmentOrder.id,
        fulfillmentOrderLineItems: lineItemsWithRemainingQuantity,
      };
    }).filter(Boolean); // Remove null entries
    
    if (lineItemsByFulfillmentOrder.length === 0) {
      this.logger.logInfo(`All items in source order ${order.sourceOrderNumber} are already fulfilled for location ${this.retailer.lglLocationId}`);
      return; // Skip fulfillment creation if all items are already fulfilled
    }

    // Prepare fulfillment info from the target order
    const fulfillment = order.fulfillments[0]; // Assume one fulfillment for now
    if (!fulfillment) {
      throw new Error('No fulfillment found on target order');
    }
    
    let trackingCompany = fulfillment.trackingInfo?.company || '';
    let trackingNumber = fulfillment.trackingInfo?.number || '';
    
    // Handle multiple tracking numbers from GraphQL
    if (Array.isArray(fulfillment.trackingInfo?.number)) {
      if (fulfillment.trackingInfo.number.length > 1) {
        trackingNumber = fulfillment.trackingInfo.number.join(', ');
        this.logger.logInfo(`Multiple tracking numbers found for order ${order.name}: ${trackingNumber}`);
      } else {
        trackingNumber = fulfillment.trackingInfo.number[0] || '';
      }
    }
    
    // If tracking info is missing, fetch from REST API
    if (!trackingCompany && !trackingNumber) {
      this.logger.logInfo('Tracking info missing from GraphQL, fetching from REST API...');
      const restData = await this.fetchFulfillmentsREST(order.id);
      if (restData.fulfillments && restData.fulfillments.length > 0) {
        const restFulfillment = restData.fulfillments[0];
        trackingCompany = restFulfillment.tracking_company || '';
        
        // Handle multiple tracking numbers from REST API
        if (Array.isArray(restFulfillment.tracking_numbers) && restFulfillment.tracking_numbers.length > 0) {
          trackingNumber = restFulfillment.tracking_numbers.join(', ');
          this.logger.logInfo(`Multiple tracking numbers from REST: ${trackingCompany} - ${trackingNumber}`);
        } else {
          trackingNumber = restFulfillment.tracking_number || '';
          this.logger.logInfo(`Single tracking number from REST: ${trackingCompany} - ${trackingNumber}`);
        }
      }
    }
    
    const createdAt = fulfillment.createdAt;
    this.logger.logInfo(`Pushing fulfillment to source order: trackingCompany='${trackingCompany}', trackingNumber='${trackingNumber}'`);

    // Create fulfillment on the source order
    const mutation = `
      mutation createFulfillment($input: FulfillmentV2Input!) {
        fulfillmentCreateV2(fulfillment: $input) {
          fulfillment {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const variables = {
      input: {
        lineItemsByFulfillmentOrder,
        trackingInfo: {
          company: trackingCompany,
          number: trackingNumber,
        },
        notifyCustomer: true,
      },
    };
    
    const result = await this.retailClient.graphql(mutation, variables);
    if (result.fulfillmentCreateV2.userErrors && result.fulfillmentCreateV2.userErrors.length > 0) {
      throw new Error('Fulfillment creation error: ' + JSON.stringify(result.fulfillmentCreateV2.userErrors));
    }
  }

  async fetchFulfillmentsREST(orderId) {
    // Handle both GraphQL IDs (gid://shopify/Order/123) and numeric IDs
    let orderIdNum;
    if (typeof orderId === 'string' && orderId.includes('/')) {
      orderIdNum = orderId.split('/').pop();
    } else {
      orderIdNum = orderId.toString();
    }
    const path = `/orders/${orderIdNum}/fulfillments.json`;
    return await this.lglClient.rest('GET', path);
  }

  async tagTargetOrder(orderId, tag) {
    // Convert numeric ID to GraphQL global ID if needed
    let globalId = orderId;
    if (typeof orderId === 'number' || (typeof orderId === 'string' && !orderId.includes('/'))) {
      globalId = `gid://shopify/Order/${orderId}`;
    }
    
    // Get current tags first
    const getOrderQuery = `
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          tags
        }
      }
    `;
    
    try {
      const orderData = await this.lglClient.graphql(getOrderQuery, { id: globalId });
      const currentTags = orderData.order.tags || [];
      const newTags = [...currentTags, tag];
      
      // Update tags using centralized query
      const result = await this.lglClient.graphql(QUERIES.updateOrderTags, {
        id: globalId,
        tags: newTags
      });
      
      if (result.orderUpdate.userErrors.length > 0) {
        this.logger.logError(`Error tagging target order: ${JSON.stringify(result.orderUpdate.userErrors)}`);
      } else {
        this.logger.logInfo(`Successfully tagged target order ${globalId} with tag: ${tag}`);
      }
    } catch (error) {
      this.logger.logError(`Failed to tag target order ${globalId}: ${error.message}`);
    }
  }
}

module.exports = { FulfillmentProcessor }; 