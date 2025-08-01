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

### Email System Testing

```bash
# Test email notifications (auto-resets state)
node scripts/test-email-notifications.js

# Test with debug mode
node scripts/test-email-notifications.js --debug

# Manual reset if needed
node scripts/test-email-notifications.js --reset
```

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
│   ├── process-all.js              # Main local script
│   ├── test-email-notifications.js # Email testing
│   └── utils/
│       ├── shopify-client.js       # API utilities
│       ├── logger.js               # Logging utilities
│       ├── order-processor.js      # Order import logic
│       ├── fulfillment-processor.js # Fulfillment pushback logic
│       ├── inventory-processor.js  # Inventory sync logic
│       ├── email-notifier.js       # Email notification system
│       └── email-templates.js      # Email template system
├── logs/
│   ├── retailer-specific/          # Per-retailer logs
│   └── email-state.json           # Email system state
├── do-import-orders.js             # DigitalOcean Function handler
├── project.yml                     # DigitalOcean Functions config
├── README.md                       # This file
├── EMAIL_SYSTEM.md                 # Email system documentation
└── package.json
```

### Core Components

#### Processors
- **OrderProcessor**: Handles order import from source stores
- **FulfillmentProcessor**: Manages fulfillment pushback to source stores
- **InventoryProcessor**: Synchronizes inventory across stores

#### Email System
- **EmailNotifier**: Manages email sending and rate limiting
- **EmailTemplates**: Generates beautiful HTML email templates

#### Utilities
- **ShopifyClient**: API client for Shopify operations
- **Logger**: Comprehensive logging system

## Adding New Retailers

1. Create a new config file in `config/retailers/`:
   ```bash
   cp config/retailers/test-store.json config/retailers/new-retailer.json
   ```

2. Update the configuration with the new retailer's details

3. No code changes needed! The system will automatically pick up the new retailer.

## Troubleshooting

### Common Issues

1. **API Token Issues**: Ensure all API tokens have the necessary permissions
2. **Location ID**: Verify the target location ID is correct for each retailer
3. **Lookback Windows**: Adjust lookback hours if orders aren't being found
4. **Email Notifications**: Check email configuration and Mailgun credentials
5. **Rate Limiting**: Reset email state if rate limiting is too restrictive

### Debug Mode

For debugging, you can run with verbose logging by modifying the logger level in the config.

### Email System Issues

```bash
# Reset email state
rm logs/email-state.json

# Or use the method
emailNotifier.resetEmailState();
```

### Logs

Check retailer-specific logs in `logs/retailer-specific/` for detailed error information.

## Performance

### Optimizations
- **Batch processing**: Efficient handling of large datasets
- **Rate limiting**: Prevents API throttling
- **Retry logic**: Handles transient failures gracefully
- **Caching**: Reduces redundant API calls
- **Parallel processing**: Concurrent operations where possible

### Monitoring
- **Success rates**: Track operation success rates
- **Duration tracking**: Monitor processing times
- **Error rates**: Identify and resolve issues quickly
- **Activity patterns**: Optimize scheduling based on usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues or questions:
- Check the logs in the `logs/` directory
- Review the email system documentation in `EMAIL_SYSTEM.md`
- Test email notifications with `scripts/test-email-notifications.js`
- Monitor email statistics and activity tracking

## License

This project is open source software.

---

**Status**: Production Ready - Comprehensive Shopify sync system with advanced email notifications and monitoring. 