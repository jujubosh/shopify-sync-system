# Inventory Sync System

This directory contains the inventory sync system that allows each retailer to have their own dedicated inventory sync script and GitHub Actions workflow.

## Structure

```
inventory-sync/
├── README.md                    # This file
├── retailers/                   # Individual retailer sync scripts
│   ├── nationwide-plants.js     # Nationwide Plants sync script
│   └── template.js              # Template for new retailers
└── .github/workflows/           # GitHub Actions workflows
    ├── inventory-sync-nationwide-plants.yml
    └── inventory-sync-template.yml
```

## How It Works

1. **Retailer Configuration**: Each retailer has a config file in `config/retailers/` with a `syncInventory` setting
2. **Individual Scripts**: Each retailer with `syncInventory: true` gets their own sync script
3. **Parallel Execution**: Each retailer's sync runs independently via separate GitHub Actions workflows
4. **Config-Driven**: Scripts respect the retailer's configuration settings

## Adding a New Retailer

### 1. Update Retailer Config

First, ensure your retailer config in `config/retailers/[retailer-name].json` has:

```json
{
  "settings": {
    "syncInventory": true
  }
}
```


Copy the template workflow:

```bash
cp .github/workflows/inventory-sync-template.yml .github/workflows/inventory-sync-[retailer-id].yml
```

Then replace these placeholders in the new workflow:

- `[RETAILER_NAME]` → Actual retailer name
- `[RETAILER_ID]` → Retailer ID (used in job names, log files, etc.)
- `[RETAILER_CONFIG_FILE]` → Config filename
- `[SOURCE_STORE_TOKEN_ENV]` → Environment variable name for the retailer's token

### 4. Add Environment Variables

Add the retailer's Shopify token to GitHub Secrets:

- Go to your repository settings
- Add a new secret: `SHOPIFY_[RETAILER]_TOKEN`
- Set the value to the retailer's Shopify access token

## Current Retailers

| Retailer | Config File | Sync Enabled | Script | Workflow |
|----------|-------------|--------------|--------|----------|
| Nationwide Plants | `nationwide-plants-config.json` | ✅ | `nationwide-plants.js` | `inventory-sync-nationwide-plants.yml` |
| Test Store | `test-store.json` | ❌ | - | - |

## Features

### Improved Performance
- **Batch Processing**: Processes SKUs in small batches (5 items) to avoid rate limits
- **Retry Logic**: Exponential backoff retry for failed operations
- **Rate Limiting**: Built-in delays between API calls
- **Parallel Processing**: Each retailer runs independently

### Better Error Handling
- **Detailed Logging**: All operations are logged with timestamps
- **Error Tracking**: Failed SKUs are tracked and reported
- **Graceful Degradation**: Individual SKU failures don't stop the entire sync

### Monitoring
- **Log Files**: Daily log files for each retailer
- **GitHub Artifacts**: Logs are uploaded as workflow artifacts
- **Slack Notifications**: Success/failure notifications
- **Config Validation**: Respects retailer configuration settings

## Running Locally

### Method 1: Environment Variables

To test a retailer's sync script locally:

```bash
# Set environment variables
export SHOPIFY_LGL_TOKEN="your-lgl-token"
export SHOPIFY_NATIONWIDE_PLANTS_TOKEN="your-nationwide-token"

# Run the sync
node inventory-sync/retailers/nationwide-plants.js
```

### Method 2: .env.local File (Recommended)

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

### Test Configuration

The scripts also support test configuration via `config/global-config-test.json`. This file can override:

- **Batch Size**: `inventory.batchSize` (default: 5)
- **Delay Between Batches**: `inventory.delayBetweenBatches` (default: 3000ms)
- **Max Retries**: `inventory.maxRetries` (default: 3)

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

### Local Testing Workflow

1. **Create .env.local**: Copy the example above and fill in your actual tokens
2. **Optional: Update test config**: Modify `config/global-config-test.json` for faster testing
3. **Run the sync**: `node inventory-sync/retailers/nationwide-plants.js`
4. **Check logs**: Look for log files in the `logs/` directory

The script will automatically:
- Load environment variables from `.env.local`
- Use test configuration if available
- Create detailed log files
- Show progress and results

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**: Ensure all required tokens are set in GitHub Secrets
2. **Rate Limiting**: If you see rate limit errors, the script will automatically retry with backoff
3. **Config Issues**: Check that `syncInventory: true` is set in the retailer config
4. **Location ID**: Verify the target location ID exists in the LGL store

### Debug Mode

To enable debug logging, set the environment variable:

```bash
export LOG_LEVEL=debug
```

### Force Run

To force run a sync even if disabled in config, use the workflow dispatch with `force_run: true`.

## Migration from Old System

The old `scripts/process-inventory.js` script has been replaced with this new per-retailer system. The benefits include:

- **Parallel Execution**: Multiple retailers can sync simultaneously
- **Better Isolation**: Issues with one retailer don't affect others
- **Easier Maintenance**: Each retailer's logic is separate
- **Config-Driven**: Respects individual retailer settings 