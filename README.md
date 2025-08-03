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

## Inventory Sync System

The inventory sync system allows each retailer to have their own dedicated inventory sync script and GitHub Actions workflow.

### Structure

```
inventory-sync/
├── README.md                    # Inventory sync documentation
├── retailers/                   # Individual retailer sync scripts
│   ├── nationwide-plants.js     # Nationwide Plants sync script
│   └── template.js              # Template for new retailers
└── .github/workflows/           # GitHub Actions workflows
    ├── inventory-sync-nationwide-plants.yml
    └── inventory-sync-template.yml
```

### How It Works

1. **Retailer Configuration**: Each retailer has a config file in `config/retailers/` with a `syncInventory` setting
2. **Individual Scripts**: Each retailer with `syncInventory: true` gets their own sync script
3. **Parallel Execution**: Each retailer's sync runs independently via separate GitHub Actions workflows
4. **Config-Driven**: Scripts respect the retailer's configuration settings

### Adding a New Retailer for Inventory Sync

#### 1. Update Retailer Config

First, ensure your retailer config in `config/retailers/[retailer-name].json` has:

```json
{
  "settings": {
    "syncInventory": true
  }
}
```

#### 2. Create Inventory Sync Script

Copy the template script:

```bash
cp inventory-sync/retailers/template.js inventory-sync/retailers/[retailer-id].js
```

Then update the script with your retailer's specific configuration.

#### 3. Create GitHub Actions Workflow

Copy the template workflow:

```bash
cp .github/workflows/inventory-sync-template.yml .github/workflows/inventory-sync-[retailer-id].yml
```

Then replace these placeholders in the new workflow:

- `[RETAILER_NAME]` → Actual retailer name
- `[RETAILER_ID]` → Retailer ID (used in job names, log files, etc.)
- `[RETAILER_CONFIG_FILE]` → Config filename
- `[SOURCE_STORE_TOKEN_ENV]` → Environment variable name for the retailer's token

#### 4. Add Environment Variables

Add the retailer's Shopify token to GitHub Secrets:

- Go to your repository settings
- Add a new secret: `SHOPIFY_[RETAILER]_TOKEN`
- Set the value to the retailer's Shopify access token

### Current Retailers

| Retailer | Config File | Sync Enabled | Script | Workflow |
|----------|-------------|--------------|--------|----------|
| Nationwide Plants | `nationwide-plants-config.json` | ✅ | `nationwide-plants.js` | `inventory-sync-nationwide-plants.yml` |
| Test Store | `test-store.json` | ❌ | - | - |

### Inventory Sync Features

#### Improved Performance
- **Batch Processing**: Processes SKUs in small batches (10 items) to avoid rate limits
- **Retry Logic**: Exponential backoff retry for failed operations
- **Rate Limiting**: Built-in delays between API calls
- **Parallel Processing**: Each retailer runs independently

#### Better Error Handling
- **Detailed Logging**: All operations are logged with timestamps
- **Error Tracking**: Failed SKUs are tracked and reported
- **Graceful Degradation**: Individual SKU failures don't stop the entire sync

#### Monitoring
- **Log Files**: Daily log files for each retailer
- **GitHub Artifacts**: Logs are uploaded as workflow artifacts
- **Slack Notifications**: Success/failure notifications
- **Config Validation**: Respects retailer configuration settings

### Running Inventory Sync Locally

#### Method 1: Environment Variables

To test a retailer's sync script locally:

```bash
# Set environment variables
export SHOPIFY_LGL_TOKEN="your-lgl-token"
export SHOPIFY_NATIONWIDE_PLANTS_TOKEN="your-nationwide-token"

# Run the sync
node inventory-sync/retailers/nationwide-plants.js
```

#### Method 2: .env.local File (Recommended)

Create a `.env.local` file in the project root for easier local testing:

```bash
# .env.local
SHOPIFY_LGL_TOKEN=your-lgl-store-token-here
SHOPIFY_NATIONWIDE_PLANTS_TOKEN=your-nationwide-plants-token-here
SHOPIFY_TEST_TOKEN=your-test-store-token-here
LOG_LEVEL=info
EMAIL_FROM=admin@livegoodlogistics.com
EMAIL_TO=justin@livegoodlogistics.com
```

Then run the sync:

```bash
node inventory-sync/retailers/nationwide-plants.js
```

The script will automatically load environment variables from `.env.local` if it exists.

#### Test Configuration

The scripts also support test configuration via `config/global-config-test.json`. This file can override:

- **Batch Size**: `inventory.batchSize` (default: 10)
- **Delay Between Batches**: `inventory.delayBetweenBatches` (default: 500ms)
- **Max Retries**: `inventory.maxRetries` (default: 1)

Example test config:

```json
{
  "inventory": {
    "batchSize": 3,
    "delayBetweenBatches": 1000,
    "maxRetries": 1
  }
}
```

This allows you to test with smaller batches and faster processing for development.

#### Local Testing Workflow

1. **Create .env.local**: Copy the example above and fill in your actual tokens
2. **Optional: Update test config**: Modify `config/global-config-test.json` for faster testing
3. **Run the sync**: `node inventory-sync/retailers/nationwide-plants.js`
4. **Check logs**: Look for log files in the `logs/` directory

The script will automatically:
- Load environment variables from `.env.local`
- Use test configuration if available
- Create detailed log files
- Show progress and results

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
│   ├── README.md                   # Inventory sync documentation
│   ├── retailers/
│   │   ├── nationwide-plants.js    # Dedicated inventory sync scripts
│   │   └── template.js             # Template for new retailers
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
│       ├── retailer-service.js     # Database retailer management
│       └── email-templates.js      # Email template system
├── .github/
│   └── workflows/
│       ├── shopify-sync.yml        # Main sync workflow (orders + fulfillments)
│       ├── inventory-sync-nationwide-plants.yml # Dedicated inventory workflow
│       └── inventory-sync-template.yml # Template for new retailers
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

**Missing Environment Variables:**
- Ensure all required tokens are set in GitHub Secrets
- Check `.env.local` file for local development

**Rate Limiting:**
- If you see rate limit errors, the script will automatically retry with backoff
- Adjust batch sizes and delays in config if needed

**Config Issues:**
- Check that `syncInventory: true` is set in the retailer config
- Verify the target location ID exists in the LGL store

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Set debug level
export LOG_LEVEL=debug

# Run with debug info
node scripts/process-all.js all
```

### Force Run

To force run a sync even if disabled in config, use the workflow dispatch with `force_run: true`.

## Migration from Old System

The old `scripts/process-inventory.js` script has been replaced with this new per-retailer system. The benefits include:

- **Parallel Execution**: Multiple retailers can sync simultaneously
- **Better Isolation**: Issues with one retailer don't affect others
- **Easier Maintenance**: Each retailer's logic is separate
- **Config-Driven**: Respects individual retailer settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.