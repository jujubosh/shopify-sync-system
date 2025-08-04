const { ShopifyClient } = require('./shopify-client');
const { Logger } = require('./logger');

class OrderProcessor {
  constructor(retailer, config) {
    this.retailer = retailer;
    this.config = config;
    // Retail store (source) - where orders originate
    this.retailClient = new ShopifyClient(retailer.domain, retailer.apiToken);
    // LGL store (target) - where orders are imported
    this.lglClient = new ShopifyClient(config.lglStore.domain, config.lglStore.apiToken);
    this.logger = new Logger(retailer.id || retailer.name, config);
  }

  async processOrders() {
    this.logger.logInfo('Starting order import process');
    const results = { total: 0, success: [], errors: [] };
    
    try {
      const orders = await this.getEligibleOrders();
      this.logger.logInfo(`Found ${orders.length} eligible orders`);
      
      let importedCount = 0;
      
      for (const order of orders) {
        try {
          this.logger.logInfo(`Processing order ${order.name}`);
          const newOrderGid = await this.importOrder(order);
          await this.tagOrders(order, newOrderGid);
          this.logger.logInfo(`Successfully imported order ${order.name} as ${newOrderGid}`);
          results.success.push(`Imported order ${order.name} as ${newOrderGid}`);
          importedCount++;
        } catch (error) {
          this.logger.logError(`Failed to import order ${order.name}: ${error.message}`);
          results.errors.push(`Failed to import order ${order.name}: ${error.message}`);
        }
      }
      
      results.total = importedCount;
      this.logger.logInfo(`Actually imported ${importedCount} orders`);
      
      return results;
    } catch (error) {
      this.logger.logError(`Failed to process orders: ${error.message}`, 'error', error);
      throw error;
    }
  }

  async getEligibleOrders() {
    const lookbackHours = this.retailer.settings.lookbackHours || this.config.defaults.lookbackHours;
    const lookbackTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
    const query = `
      query getOrders {
        orders(first: 50, query: "financial_status:paid -tag:imported-to-LGL created_at:>='${lookbackTime}'") {
          edges {
            node {
              id
              name
              tags
              note
              cancelReason
              cancelledAt
              metafields(first: 10, namespace: "custom") {
                edges {
                  node {
                    key
                    value
                  }
                }
              }
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    sku
                    quantity
                    name
                    variant {
                      id
                    }
                  }
                }
              }
              fulfillmentOrders(first: 10) {
                edges {
                  node {
                    id
                    assignedLocation {
                      location {
                        id
                        name
                      }
                    }
                    lineItems(first: 50) {
                      edges {
                        node {
                          lineItem {
                            id
                          }
                          remainingQuantity
                        }
                      }
                    }
                  }
                }
              }
              shippingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                zip
                country
                phone
              }
              note
            }
          }
        }
      }
    `;
    const data = await this.retailClient.graphql(query);
    const orders = [];
    const locationGid = `gid://shopify/Location/${this.retailer.lglLocationId}`;
    
    this.logger.logInfo(`Found ${data.orders.edges.length} orders from GraphQL query`);
    
    for (const edge of data.orders.edges) {
      const order = edge.node;
      this.logger.logInfo(`Processing order ${order.name}`);
      
      if (order.cancelReason || order.cancelledAt) {
        this.logger.logInfo(`Skipping ${order.name}: cancelled`);
        continue;
      }
      
      if (order.tags.includes('imported-to-LGL')) {
        this.logger.logInfo(`Skipping ${order.name}: already imported`);
        continue;
      }
      
      const lglFulfillmentOrderEdge = order.fulfillmentOrders.edges.find(
        fo => fo.node.assignedLocation && fo.node.assignedLocation.location && fo.node.assignedLocation.location.id === locationGid
      );
      
      if (!lglFulfillmentOrderEdge) {
        this.logger.logInfo(`Skipping ${order.name}: no LGL fulfillment order`);
        continue;
      }
      
      const lglFulfillmentOrder = lglFulfillmentOrderEdge.node;
      const fulfillmentLineItemIdToQty = {};
      
      for (const itemEdge of lglFulfillmentOrder.lineItems.edges) {
        const item = itemEdge.node;
        if (item.remainingQuantity > 0) {
          fulfillmentLineItemIdToQty[item.lineItem.id] = item.remainingQuantity;
        }
      }
      
      this.logger.logInfo(`Order ${order.name}: ${Object.keys(fulfillmentLineItemIdToQty).length} line items with remaining quantity`);
      
      const lglLineItems = order.lineItems.edges
        .filter(edge => fulfillmentLineItemIdToQty[edge.node.id])
        .map(edge => ({
          ...edge.node,
          quantity: fulfillmentLineItemIdToQty[edge.node.id],
        }));
      
      if (lglLineItems.length === 0) {
        this.logger.logInfo(`Skipping ${order.name}: no matching line items`);
        continue;
      }
      
      this.logger.logInfo(`Order ${order.name}: ${lglLineItems.length} LGL line items - ELIGIBLE`);
      orders.push({
        ...order,
        lglFulfillmentOrder,
        lglLineItems,
      });
    }
    
    this.logger.logInfo(`Final result: ${orders.length} eligible orders`);
    return orders;
  }

  async importOrder(order) {
    const lineItems = [];
    for (const item of order.lglLineItems) {
      const variantInfo = await this.getTargetVariantAndPriceBySKU(item.sku);
      if (!variantInfo) {
        this.logger.logError(`SKU '${item.sku}' in order ${order.name} not found in target store, skipping line item.`);
        continue;
      }
      lineItems.push({
        variant_id: variantInfo.variantId.split('/').pop(),
        quantity: item.quantity,
        price: variantInfo.price || 0,
        title: item.name,
        sku: item.sku
      });
    }
    if (lineItems.length === 0) throw new Error('No valid line items for LGL fulfillment');
    const shipping = order.shippingAddress;
    const shippingAddress = {
      first_name: shipping.firstName,
      last_name: shipping.lastName,
      address1: shipping.address1,
      address2: shipping.address2,
      city: shipping.city,
      province: shipping.province,
      zip: shipping.zip,
      country: shipping.country,
      phone: shipping.phone,
    };
    const billingAddress = this.retailer.billingAddress;
    let tag1 = order.name.replace('#', '');
    let tag2 = `imported-from-${this.retailer.name.replace(/\s+/g, '-').toLowerCase()}`;
    tag1 = tag1.replace(/[^a-zA-Z0-9-_ ]/g, '').substring(0, 40);
    tag2 = tag2.replace(/[^a-zA-Z0-9-_ ]/g, '').substring(0, 40);
    const tags = `${tag1},${tag2}`;
    // Prepare note attributes
    const noteAttributes = [
      { name: 'order_number', value: order.name.replace('#', '') }
    ];
    
    // Extract ship date from target store's order data
    let shipDate = null;
    
    // Check metafields for ship date
    if (order.metafields && order.metafields.edges) {
      const shipDateMetafield = order.metafields.edges.find(edge => 
        edge.node.key === 'ship_date' || 
        edge.node.key === 'shipped_date' ||
        edge.node.key === 'flare_ship_date' ||
        edge.node.key === '__flare_ship_date'
      );
      if (shipDateMetafield) {
        shipDate = shipDateMetafield.node.value;
        this.logger.logInfo(`Found ship date in metafields: ${shipDate}`);
      }
    }
    
    // If no ship date found, use current date as fallback
    if (!shipDate) {
      shipDate = new Date().toISOString().split('T')[0];
      this.logger.logInfo(`No ship date found in target store, using current date: ${shipDate}`);
    }
    
    // Add the flare ship date to note attributes
    noteAttributes.push({ name: '__flare_ship_date', value: shipDate });
    this.logger.logInfo(`Setting flare ship date to: ${shipDate}`);
    
    const orderPayload = {
      order: {
        email: billingAddress.email,
        line_items: lineItems,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        tags,
        financial_status: 'paid',
        inventory_behaviour: 'decrement_ignoring_policy',
        note_attributes: noteAttributes,
        note: order.note || undefined,
      },
    };
    const path = '/orders.json';
    const result = await this.lglClient.rest('POST', path, orderPayload);
    if (!result.order || !result.order.id) {
      throw new Error('Order creation error: ' + JSON.stringify(result));
    }
    const orderGid = `gid://shopify/Order/${result.order.id}`;
    return orderGid;
  }

  async getTargetVariantAndPriceBySKU(sku) {
    const query = `
      query getVariantBySKU($sku: String!) {
        productVariants(first: 1, query: $sku) {
          edges {
            node {
              id
              sku
              metafield(namespace: "custom", key: "retailer_cost") {
                value
              }
            }
          }
        }
      }
    `;
    const data = await this.lglClient.graphql(query, { sku });
    const edge = data.productVariants.edges[0];
    if (!edge) return null;
    const variant = edge.node;
    let price = 0;
    if (variant.metafield && variant.metafield.value) {
      price = parseFloat(variant.metafield.value);
    }
    return { variantId: variant.id, price };
  }

  async tagOrders(sourceOrder, targetOrderGid) {
    this.logger.logInfo(`Tagging source order ${sourceOrder.id} and target order ${targetOrderGid}`);
    
    // Tag the source order to prevent duplicate imports
    const sourceTagMutation = `
      mutation tagOrder($id: ID!, $tags: [String!]!) {
        orderUpdate(input: { id: $id, tags: $tags }) {
          order {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const currentTags = sourceOrder.tags || [];
    const newTags = [...currentTags, 'imported-to-LGL'];
    
    try {
      const result = await this.retailClient.graphql(sourceTagMutation, {
        id: sourceOrder.id,
        tags: newTags
      });
      
      if (result.orderUpdate.userErrors.length > 0) {
        this.logger.logError(`Error tagging source order: ${JSON.stringify(result.orderUpdate.userErrors)}`);
      } else {
        this.logger.logInfo(`Successfully tagged source order with 'imported-to-LGL'`);
      }
    } catch (error) {
      this.logger.logError(`Failed to tag source order: ${error.message}`);
    }
    
    // Tag the target order with source order info
    const targetTagMutation = `
      mutation tagOrder($id: ID!, $tags: [String!]!) {
        orderUpdate(input: { id: $id, tags: $tags }) {
          order {
            id
            tags
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    try {
      const result = await this.lglClient.graphql(targetTagMutation, {
        id: targetOrderGid,
        tags: [
          `imported-from-${this.retailer.name.replace(/\s+/g, '-').toLowerCase()}`,
          sourceOrder.name.replace('#', '') // Add original order number as tag
        ]
      });
      
      if (result.orderUpdate.userErrors.length > 0) {
        this.logger.logError(`Error tagging target order: ${JSON.stringify(result.orderUpdate.userErrors)}`);
      } else {
        this.logger.logInfo(`Successfully tagged target order`);
      }
    } catch (error) {
      this.logger.logError(`Failed to tag target order: ${error.message}`);
    }
  }
}

module.exports = { OrderProcessor }; 