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

- Node.js 14+
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
  "targetStore": {
    "domain": "your-target-store.myshopify.com",
    "apiToken": "your-api-token"
  },
  "defaults": {
    "maxRetries": 3,
    "lookbackHours": 4,
    "fulfillmentLookbackHours": 24
  },
  "inventory": {
    "batchSize": 10,
    "delayBetweenBatches": 2000,
    "maxRetries": 3
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
  "targetLocationId": "location-id",
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
node scripts/process-inventory.js

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

### Inventory Sync Workflow (`inventory-sync.yml`)
- **Schedule**: Runs every 5 minutes (independent of main sync)
- **Operations**: Inventory synchronization only
- **Manual trigger**: Available with optional retailer filtering
- **Features**:
  - Processes all retailers with inventory sync enabled
  - Optional retailer-specific processing
  - Separate logging and error handling
  - Independent email notifications
  - **Dynamic retailer options**: Automatically generated from config files

#### Manual Trigger Options

**Process all retailers:**
```bash
# Trigger via GitHub UI or API
# Select "all" from the retailer dropdown
```

**Process specific retailer:**
```bash
# Trigger via GitHub UI or API
# Select specific retailer from dropdown (e.g., "test-store", "nationwide-plants-config")
```

**Available retailers:**
- `test-store` - Test Retail Store
- `nationwide-plants-config` - Nationwide Plants

#### Dynamic Workflow Generation

The inventory workflow options are automatically generated from retailer configs:

```bash
# Generate updated workflow with current retailers
node scripts/generate-workflow-inputs.js
```

This script:
- Reads all retailer configs from `config/retailers/`
- Generates updated workflow YAML with current retailer options
- Creates documentation file (`RETAILER_OPTIONS.md`) with current status
- Should be run whenever new retailers are added

**Adding new retailers:**
1. Add retailer config file to `config/retailers/`
2. Run `node scripts/generate-workflow-inputs.js`
3. Commit the updated workflow file
4. The new retailer will appear in the GitHub UI dropdown

#### Automated Workflow Updates

The system includes automatic workflow updates to ensure the inventory workflow is always current:

**Local Git Hooks**:
```bash
# Setup automatic pre-commit hooks
./scripts/setup-git-hooks.sh

# Manual pre-commit check
./scripts/pre-commit-hook.sh
```

The pre-commit hook:
- Checks if retailer configs have changed
- Automatically updates workflow if needed
- Adds workflow changes to your commit
- Can be bypassed with `git commit --no-verify`

**Manual Workflow Updates**:
```bash
# Generate updated workflow with current retailers
node scripts/generate-workflow-inputs.js

# Commit the changes
git add .github/workflows/inventory-sync.yml RETAILER_OPTIONS.md
git commit -m "Update inventory workflow with latest retailers"
git push
```

## Adding New Retailers

1. Create a new config file in `config/retailers/`:
   ```bash
   cp config/retailers/test-store.json config/retailers/new-retailer.json
   ```

2. Update the configuration with the new retailer's details

3. **Update inventory workflow** (if needed):
   ```bash
   node scripts/generate-workflow-inputs.js
   git add .github/workflows/inventory-sync.yml RETAILER_OPTIONS.md
   git commit -m "Update inventory workflow with latest retailers"
   git push
   ```

4. No code changes needed! The system will automatically pick up the new retailer.

### Dynamic Workflow Generation

The inventory sync workflow uses dynamic retailer options generated from config files:

```bash
# Generate updated workflow with current retailers
node scripts/generate-workflow-inputs.js
```

This creates:
- Updated `.github/workflows/inventory-sync.yml` with current retailer options
- `RETAILER_OPTIONS.md` with current retailer status and documentation

**Workflow:**
1. Add retailer config file to `config/retailers/`
2. Run `node scripts/generate-workflow-inputs.js`
3. Commit the updated workflow file
4. The new retailer will appear in GitHub UI dropdown options

### Workflow Features
- **Independent scheduling**: Inventory sync runs separately from main sync
- **Error notifications**: Slack alerts on failures
- **Log retention**: 7-day log retention for debugging
- **Environment variables**: Secure secret management
- **Retry logic**: Built-in error handling and retries

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

## Architecture

### File Structure
```
test-ds-process/
├── config/
│   ├── global-config.json          # Shared settings
│   ├── global-config-test.json     # Test configuration
│   └── retailers/
│       ├── test-store.json         # Retailer configurations
│       └── new-retailer.json       # Add more retailers here
├── scripts/
│   ├── process-all.js              # Main local script (orders + fulfillments)
│   ├── process-inventory.js        # Dedicated inventory processing
│   ├── generate-workflow-inputs.js # Dynamic workflow generation
│   ├── setup-git-hooks.sh         # Git hooks setup script
│   ├── pre-commit-hook.sh         # Pre-commit hook for workflow updates
│   ├── test-email-notifications.js # Email testing
│   ├── test-inventory-workflow.js  # Inventory workflow testing
│   └── utils/
│       ├── shopify-client.js       # API utilities
│       ├── logger.js               # Logging utilities
│       ├── order-processor.js      # Order import logic
│       ├── fulfillment-processor.js # Fulfillment pushback logic
│       ├── inventory-processor.js  # Inventory sync logic
│       ├── email-notifier.js       # Email notification system
│       └── email-templates.js      # Email template system
├── .github/
│   └── workflows/
│       ├── shopify-sync.yml        # Main sync workflow (orders + fulfillments)
│       └── inventory-sync.yml      # Dedicated inventory workflow (auto-generated)
├── logs/
│   ├── retailer-specific/          # Per-retailer logs
│   └── email-state.json           # Email system state
├── RETAILER_OPTIONS.md            # Auto-generated retailer documentation
├── do-import-orders.js             # DigitalOcean Function handler
├── project.yml                     # DigitalOcean Functions config
├── README.md                       # This file
├── EMAIL_SYSTEM.md                 # Email system documentation
└── package.json
```

**Local development:**
```bash
# Setup hooks
./scripts/setup-git-hooks.sh

# Normal workflow (hooks run automatically)
git add config/retailers/new-retailer.json
git commit -m "Add retailer"  # Pre-commit hook runs automatically
```

## Adding New Retailers