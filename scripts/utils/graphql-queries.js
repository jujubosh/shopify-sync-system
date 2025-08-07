/**
 * Optimized GraphQL queries for Shopify API
 * These queries are designed to fetch only the necessary data
 * and follow Shopify's best practices for performance
 */

const QUERIES = {
  // Optimized order query - fetches only essential data
  getEligibleOrders: `
    query getEligibleOrders($lookbackTime: DateTime!, $first: Int!) {
      orders(first: $first, query: "financial_status:paid -tag:imported-to-LGL created_at:>=$lookbackTime") {
        edges {
          node {
            id
            name
            tags
            note
            cancelReason
            cancelledAt
            createdAt
            updatedAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            shippingAddress {
              firstName
              lastName
              address1
              city
              province
              zip
              country
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
                    sku
                    price
                    title
                  }
                }
              }
            }
            fulfillmentOrders(first: 1) {
              edges {
                node {
                  id
                  status
                  assignedLocation {
                    location {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,

  // Optimized fulfillment query - replaces REST API usage
  getFulfilledOrders: `
    query getFulfilledOrders($lookbackTime: DateTime!, $first: Int!) {
      orders(first: $first, query: "fulfillment_status:fulfilled created_at:>=$lookbackTime -tag:fulfillment-pushed") {
        edges {
          node {
            id
            name
            tags
            displayFulfillmentStatus
            fulfillments(first: 10) {
              edges {
                node {
                  id
                  status
                  trackingInfo {
                    number
                    url
                    company
                  }
                  lineItems(first: 50) {
                    edges {
                      node {
                        id
                        quantity
                        remainingQuantity
                        lineItem {
                          id
                          sku
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `,

  // Product variant lookup by SKU
  getProductVariantBySku: `
    query getProductVariantBySku($sku: String!) {
      productVariants(first: 1, query: "sku:$sku") {
        edges {
          node {
            id
            sku
            price
            title
            product {
              id
              title
              handle
            }
          }
        }
      }
    }
  `,

  // Create order mutation
  createOrder: `
    mutation createOrder($input: OrderInput!) {
      orderCreate(input: $input) {
        order {
          id
          name
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  // Update order tags
  updateOrderTags: `
    mutation updateOrderTags($id: ID!, $tags: [String!]!) {
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
  `,

  // Create fulfillment
  createFulfillment: `
    mutation createFulfillment($input: FulfillmentInput!) {
      fulfillmentCreate(input: $input) {
        fulfillment {
          id
          status
          trackingInfo {
            number
            url
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `,

  // Get shop information
  getShopInfo: `
    query getShopInfo {
      shop {
        id
        name
        myshopifyDomain
        currencyCode
        primaryDomain {
          url
        }
      }
    }
  `,

  // Get location information
  getLocations: `
    query getLocations($first: Int!) {
      locations(first: $first) {
        edges {
          node {
            id
            name
            address {
              address1
              city
              province
              zip
              country
            }
          }
        }
      }
    }
  `,

  // Get inventory levels
  getInventoryLevels: `
    query getInventoryLevels($locationId: ID!, $first: Int!) {
      location(id: $locationId) {
        inventoryLevels(first: $first) {
          edges {
            node {
              id
              available
              item {
                id
                sku
                tracked
              }
            }
          }
        }
      }
    }
  `
};

/**
 * Helper function to build order input for order creation
 */
function buildOrderInput(orderData, targetLocationId) {
  return {
    email: orderData.shippingAddress?.email || 'customer@example.com',
    tags: orderData.tags || [],
    note: orderData.note || '',
    shippingAddress: orderData.shippingAddress ? {
      firstName: orderData.shippingAddress.firstName,
      lastName: orderData.shippingAddress.lastName,
      address1: orderData.shippingAddress.address1,
      city: orderData.shippingAddress.city,
      province: orderData.shippingAddress.province,
      zip: orderData.shippingAddress.zip,
      country: orderData.shippingAddress.country
    } : null,
    lineItems: orderData.lineItems.edges.map(edge => ({
      variantId: edge.node.variant.id,
      quantity: edge.node.quantity,
      customAttributes: [
        { key: 'source_sku', value: edge.node.sku },
        { key: 'source_name', value: edge.node.name }
      ]
    })),
    locationId: targetLocationId
  };
}

/**
 * Helper function to build fulfillment input
 */
function buildFulfillmentInput(orderId, lineItems, trackingInfo = null) {
  return {
    orderId: orderId,
    lineItems: lineItems.map(item => ({
      id: item.lineItem.id,
      quantity: item.quantity
    })),
    trackingInfo: trackingInfo ? {
      number: trackingInfo.number,
      url: trackingInfo.url,
      company: trackingInfo.company
    } : null
  };
}

/**
 * Helper function to add tags to existing tags
 */
function addTags(existingTags, newTags) {
  const tagsArray = existingTags ? existingTags.split(',').map(t => t.trim()) : [];
  const uniqueTags = [...new Set([...tagsArray, ...newTags])];
  return uniqueTags.join(', ');
}

module.exports = {
  QUERIES,
  buildOrderInput,
  buildFulfillmentInput,
  addTags
};
