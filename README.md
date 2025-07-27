# Shopify Order Processor

A scalable, config-driven system for importing orders from multiple Shopify stores and pushing fulfillments back to source stores.

## Features

- **Multi-retailer support**: Config-driven approach for easy retailer management
- **Order import**: Import orders from source stores to target store
- **Fulfillment pushback**: Push fulfillments from target store back to source stores
- **Per-retailer settings**: Custom lookback windows and configurations
- **Modular architecture**: Shared utilities, no code duplication
- **Comprehensive logging**: Retailer-specific logs and error handling

## Local Development

### Prerequisites

- Node.js 14+
- npm or yarn

### Installation

```bash
npm install
```

### Configuration

1. **Global Configuration** (`config/global-config.json`):
   ```json
   {
     "targetStore": {
       "domain": "your-target-store.myshopify.com",
       "apiToken": "your-api-token"
     },
     "defaults": {
       "maxRetries": 3,
       "lookbackHours": 4,
       "fulfillmentLookbackHours": 24
     }
   }
   ```

2. **Retailer Configuration** (`config/retailers/retailer-name.json`):
   ```json
   {
     "name": "Retailer Name",
     "domain": "retailer-store.myshopify.com",
     "apiToken": "retailer-api-token",
     "lglLocationId": "location-id",
     "billingAddress": {
       "email": "billing@example.com",
       "first_name": "B2B:",
       "last_name": "Retailer Name",
       "address1": "123 Main St",
       "city": "City",
       "province": "State",
       "zip": "12345",
       "country": "United States"
     },
     "settings": {
       "enabled": true,
       "importOrders": true,
       "pushFulfillments": true,
       "customFields": {
         "includeNote": true,
         "includeTags": true
       },
       "lookbackHours": 6,
       "fulfillmentLookbackHours": 24
     }
   }
   ```

### Usage

#### Run All Operations
```bash
node scripts/process-all.js all
```

#### Run Order Imports Only
```bash
node scripts/process-all.js orders
```

#### Run Fulfillment Pushbacks Only
```bash
node scripts/process-all.js fulfillments
```

#### Run for Specific Retailer
```bash
RETAILER_ID=retailer-name node scripts/process-all.js all
```

## DigitalOcean Functions Deployment

### Prerequisites

- DigitalOcean account
- doctl CLI installed and authenticated

### Deployment

1. **Install doctl CLI** (if not already installed):
   ```bash
   # macOS
   brew install doctl
   
   # Linux
   snap install doctl
   ```

2. **Authenticate with DigitalOcean**:
   ```bash
   doctl auth init
   ```

3. **Deploy the function**:
   ```bash
   doctl serverless deploy .
   ```

4. **Invoke the function**:

   **Run all operations:**
   ```bash
   doctl serverless functions invoke shopify-order-processor/do-import-orders
   ```

   **Run specific operation:**
   ```bash
   doctl serverless functions invoke shopify-order-processor/do-import-orders --param operation orders
   doctl serverless functions invoke shopify-order-processor/do-import-orders --param operation fulfillments
   ```

   **Run for specific retailer:**
   ```bash
   doctl serverless functions invoke shopify-order-processor/do-import-orders --param retailerId test-store
   ```

   **Run specific operation for specific retailer:**
   ```bash
   doctl serverless functions invoke shopify-order-processor/do-import-orders --param operation orders --param retailerId test-store
   ```

### HTTP Endpoint

After deployment, you'll get a public HTTP endpoint. You can call it with:

```bash
curl -X POST "https://faas-nyc1-xxxx.functions.digitalocean.com/api/v1/web/your-namespace/shopify-order-processor/do-import-orders" \
  -H "Content-Type: application/json" \
  -d '{"operation": "all"}'
```

### Scheduling

You can schedule the function to run automatically using:

1. **DigitalOcean's built-in scheduling** (if available)
2. **External cron service** (like cron-job.org)
3. **Webhook triggers** from Shopify

## Adding New Retailers

1. Create a new config file in `config/retailers/`:
   ```bash
   cp config/retailers/test-store.json config/retailers/new-retailer.json
   ```

2. Update the configuration with the new retailer's details

3. No code changes needed! The system will automatically pick up the new retailer.

## File Structure

```
test-ds-process/
├── config/
│   ├── global-config.json          # Shared settings
│   └── retailers/
│       ├── test-store.json         # Retailer configurations
│       └── new-retailer.json       # Add more retailers here
├── scripts/
│   ├── process-all.js              # Main local script
│   └── utils/
│       ├── shopify-client.js       # API utilities
│       ├── logger.js               # Logging utilities
│       ├── order-processor.js      # Order import logic
│       └── fulfillment-processor.js # Fulfillment pushback logic
├── logs/
│   └── retailer-specific/          # Per-retailer logs
├── do-import-orders.js             # DigitalOcean Function handler
├── project.yml                     # DigitalOcean Functions config
└── package.json
```

## Troubleshooting

### Common Issues

1. **API Token Issues**: Ensure all API tokens have the necessary permissions
2. **Location ID**: Verify the LGL location ID is correct for each retailer
3. **Lookback Windows**: Adjust lookback hours if orders aren't being found
4. **Logs**: Check retailer-specific logs in `logs/retailer-specific/`

### Debug Mode

For debugging, you can run with verbose logging by modifying the logger level in the config.

## Support

For issues or questions, check the logs in the `logs/` directory for detailed error information. 