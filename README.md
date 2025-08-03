# Shopify Sync System

A comprehensive, production-ready system for synchronizing orders, fulfillments, and inventory across multiple Shopify stores with advanced email notifications and monitoring.

## Features

### Core Operations
- **Multi-retailer support**: Config-driven approach for easy retailer management
- **Order import**: Import orders from source stores to target store
- **Fulfillment pushback**: Push fulfillments from target store back to source stores
- **Inventory sync**: Real-time inventory synchronization across stores
- **Per-retailer settings**: Custom lookback windows and configurations
- **Modular architecture**: Shared utilities, no code duplication

### Enhanced Email Notifications
- **Real-time alerts**: Instant notifications for all operations
- **Mobile-optimized templates**: Beautiful, responsive email design
- **Smart rate limiting**: Prevents email spam with intelligent filtering
- **Activity tracking**: Comprehensive monitoring and analytics
- **Error handling**: Robust retry logic with exponential backoff
- **Quiet hours**: Configurable quiet periods to avoid nighttime notifications

### Monitoring & Analytics
- **Comprehensive logging**: Retailer-specific logs and error handling
- **Success rate tracking**: Visual progress indicators for all operations
- **Activity history**: Detailed tracking of all system activities
- **Performance metrics**: Duration tracking and optimization insights
- **Debug capabilities**: Optional detailed debugging information

## Prerequisites

- Node.js 18+
- npm or yarn
- DigitalOcean account (for cloud deployment)
- Mailgun account (for email notifications)

## Installation

```bash
# Clone the repository
git clone https://github.com/jujubosh/shopify-sync-system.git
cd shopify-sync-system

# Install dependencies
npm install
```

## Configuration

### 1. Global Configuration (`config/global-config.json`)

```json
{
  "lglStore": {
    "domain": "your-target-store.myshopify.com",
    "apiToken": "your-api-token"
  },
  "defaults": {
    "maxRetries": 1,
    "lookbackHours": 4,
    "fulfillmentLookbackHours": 24
  },
  "shopifyApi": {
    "rateLimiting": {
      "enabled": true,
      "requestsPerSecond": 4,
      "maxConcurrentRequests": 10,
      "rateLimitWindowMs": 5000,
      "maxRetries": 3,
      "retryDelayMs": 1000,
      "exponentialBackoff": true,
      "timeoutMs": 3000
    }
  },
  "inventory": {
    "batchSize": 10,
    "delayBetweenBatches": 500,
    "maxRetries": 1
  },
  "logging": {
    "level": "info",
    "retentionDays": 30
  },
  "mailgun": {
    "apiKey": "your-mailgun-api-key",
    "domain": "your-mailgun-domain"
  },
  "emailNotifications": {
    "enabled": true,
    "fromEmail": "admin@yourcompany.com",
    "toEmail": "admin@yourcompany.com",
    "sendErrors": true,
    "sendSummaries": true,
    "sendFulfillmentAlerts": true,
    "sendOrderAlerts": true,
    "sendInventoryAlerts": true,
    "minActivityThreshold": 1,
    "rateLimitMinutes": 30,
    "quietHours": {
      "start": 22,
      "end": 7
    },
    "maxRetries": 3,
    "retryDelayMs": 5000,
    "exponentialBackoff": true,
    "includeDebugInfo": false,
    "subjectPrefix": "",
    "activityTracking": true,
    "maxActivityHistory": 100
  }
}
```

### 2. Retailer Configuration (`config/retailers/retailer-name.json`)

```json
{
  "name": "Retailer Name",
  "domain": "retailer-store.myshopify.com",
  "apiToken": "retailer-api-token",
  "targetLocationId": "gid://shopify/Location/location-id",
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
    "syncInventory": true,
    "customFields": {
      "includeNote": true,
      "includeTags": true
    },
    "lookbackHours": 6,
    "fulfillmentLookbackHours": 24
  }
}
```

## Usage

### Local Development

#### Run All Operations
```bash
node scripts/process-all.js all
```

#### Run Specific Operations
```bash
# Order imports only
node scripts/process-all.js orders

# Fulfillment pushbacks only
node scripts/process-all.js fulfillments

# Inventory sync only
node scripts/process-all.js inventory
```

#### Run for Specific Retailer
```bash
RETAILER_ID=retailer-name node scripts/process-all.js all
```

### Dedicated Inventory Processing

The inventory sync has been separated into its own dedicated workflow for better performance and independent scheduling:

```bash
# Process all retailers with inventory sync enabled
node inventory-sync/retailers/nationwide-plants.js

# Process specific retailer
RETAILER_ID=retailer-name node scripts/process-inventory.js
```

### Email System Testing

```bash
# Test email notifications (auto-resets state)
node scripts/test-email-notifications.js

# Test with debug mode
node scripts/test-email-notifications.js --debug

# Manual reset if needed
node scripts/test-email-notifications.js --reset
```

## GitHub Actions Workflows

The system includes automated GitHub Actions workflows for continuous processing:

### Main Sync Workflow (`shopify-sync.yml`)
- **Schedule**: Runs every 10 minutes
- **Operations**: Orders and fulfillments
- **Manual trigger**: Available for specific operations
- **Logs**: Uploaded as artifacts for debugging

### Inventory Sync Workflow (`inventory-sync-nationwide-plants.yml`)
- **Schedule**: Runs every 5 minutes (independent of main sync)
- **Operations**: Inventory synchronization only
- **Manual trigger**: Available with optional retailer filtering
- **Features**:
  - Processes Nationwide Plants inventory sync
  - Config-driven enabled/disabled detection
  - Separate logging and error handling
  - Independent email notifications
  - Optimized batch processing (10 SKUs per batch, 500ms delays)

#### Manual Trigger Options

**Force run (bypass config):**
```bash
# Trigger via GitHub UI with force_run=true
# This will run even if syncInventory is disabled in config
```

**Normal run (respect config):**
```bash
# Trigger via GitHub UI with force_run=false (default)
# This will only run if syncInventory is enabled in config
```

## Recent Improvements

### Module System Optimization
- ✅ **Fixed ES module compatibility**: Converted all scripts to CommonJS for production stability
- ✅ **Optimized inventory sync**: Reduced batch delays from 3000ms to 500ms
- ✅ **Improved error handling**: Better retry logic and error reporting
- ✅ **Enhanced logging**: Eliminated redundant config loading messages

### Performance Optimizations
- ✅ **Batch size**: Increased from 5 to 10 SKUs per batch
- ✅ **Delay reduction**: Decreased from 3000ms to 500ms between batches
- ✅ **Retry optimization**: Reduced max retries from 3 to 1 for faster processing
- ✅ **Config loading**: Load global config once instead of per SKU

### GitHub Actions Enhancements
- ✅ **Proper config detection**: Fixed inventory sync enabled/disabled detection
- ✅ **Production config**: Uses `global-config.json` instead of test config
- ✅ **Error notifications**: Slack alerts on failures
- ✅ **Log retention**: 7-day log retention for debugging

## Adding New Retailers

1. Create a new config file in `config/retailers/`:
   ```bash
   cp config/retailers/nationwide-plants-config.json config/retailers/new-retailer.json
   ```

2. Update the configuration with the new retailer's details

3. **For inventory sync**: Create a new inventory sync script:
   ```bash
   cp inventory-sync/retailers/nationwide-plants.js inventory-sync/retailers/new-retailer.js
   ```

4. **Update GitHub Actions**: Create a new workflow file:
   ```bash
   cp .github/workflows/inventory-sync-nationwide-plants.yml .github/workflows/inventory-sync-new-retailer.yml
   ```

5. No code changes needed! The system will automatically pick up the new retailer.

## Architecture

### File Structure
```
test-ds-process/
├── config/
│   ├── global-config.json          # Production settings
│   ├── global-config-test.json     # Test configuration
│   └── retailers/
│       ├── nationwide-plants-config.json  # Retailer configurations
│       └── new-retailer.json       # Add more retailers here
├── inventory-sync/
│   ├── retailers/
│   │   └── nationwide-plants.js    # Dedicated inventory sync scripts
│   └── test-single-sku.js          # Testing utilities
├── scripts/
│   ├── process-all.js              # Main local script (orders + fulfillments)
│   ├── process-inventory.js        # Dedicated inventory processing
│   ├── generate-workflow-inputs.js # Dynamic workflow generation
│   ├── setup-git-hooks.sh         # Git hooks setup script
│   ├── pre-commit-hook.sh         # Pre-commit hook for workflow updates
│   ├── test-email-notifications.js # Email testing
│   └── utils/
│       ├── shopify-client.js       # API utilities
│       ├── logger.js               # Logging utilities
│       ├── order-processor.js      # Order import logic
│       ├── fulfillment-processor.js # Fulfillment pushback logic
│       ├── inventory-processor.js  # Inventory sync logic
│       ├── email-notifier.js       # Email notification system
│       ├── database-email-notifier.js # Database-backed email system
│       └── email-templates.js      # Email template system
├── .github/
│   └── workflows/
│       ├── shopify-sync.yml        # Main sync workflow (orders + fulfillments)
│       └── inventory-sync-nationwide-plants.yml # Dedicated inventory workflow
├── logs/
│   ├── retailer-specific/          # Per-retailer logs
│   └── email-state.json           # Email system state
├── do-import-orders.js             # DigitalOcean Function handler
├── project.yml                     # DigitalOcean Functions config
├── README.md                       # This file
├── EMAIL_SYSTEM.md                 # Email system documentation
└── package.json
```

## Email Notifications

The system includes a comprehensive email notification system with:

### Email Types
- **Fulfillment Alerts**: Real-time notifications for fulfillment processing
- **Order Alerts**: Notifications for order import operations
- **Inventory Alerts**: Updates for inventory synchronization
- **Error Notifications**: Critical error alerts with detailed context
- **Summary Reports**: Comprehensive daily/weekly summaries

### Features
- **Mobile-optimized templates**: Beautiful, responsive design
- **Smart rate limiting**: Prevents email spam
- **Activity tracking**: Comprehensive monitoring
- **Quiet hours**: Configurable quiet periods
- **Retry logic**: Automatic retry with exponential backoff

For detailed email system documentation, see [EMAIL_SYSTEM.md](./EMAIL_SYSTEM.md).

## Monitoring & Analytics

### Email Statistics
```javascript
const stats = emailNotifier.getEmailStats();
console.log('Total emails:', stats.totalEmails);
console.log('Email counts:', stats.emailCounts);
console.log('Last email times:', stats.lastEmailTimes);
```

### Activity Tracking
- Track all system activities
- Monitor success rates
- Analyze performance patterns
- Debug issues with detailed logs

## DigitalOcean Functions Deployment

### Prerequisites

- DigitalOcean account
- doctl CLI installed and authenticated

### Deployment

1. **Install doctl CLI**:
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
   doctl serverless functions invoke shopify-order-processor/do-import-orders --param operation inventory
   ```

   **Run for specific retailer:**
   ```bash
   doctl serverless functions invoke shopify-order-processor/do-import-orders --param retailerId test-store
   ```

### HTTP Endpoint

After deployment, you'll get a public HTTP endpoint:

```bash
curl -X POST "https://faas-nyc1-xxxx.functions.digitalocean.com/api/v1/web/your-namespace/shopify-order-processor/do-import-orders" \
  -H "Content-Type: application/json" \
  -d '{"operation": "all"}'
```

## Troubleshooting

### Common Issues

**Module system errors:**
- All scripts now use CommonJS for production stability
- No more ES module compatibility issues

**Inventory sync performance:**
- Optimized batch processing (10 SKUs per batch)
- Reduced delays (500ms between batches)
- Single config loading per run

**GitHub Actions failures:**
- Fixed config detection for inventory sync enabled/disabled
- Proper production config usage
- Enhanced error handling and logging

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set debug level
export LOG_LEVEL=debug

# Run with debug info
node scripts/process-all.js all
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.