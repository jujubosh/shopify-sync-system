# Available Retailers for Inventory Sync

This file is auto-generated from retailer configs. Last updated: 2025-08-02T21:36:05.048Z

## Retailer Options

| ID | Name | Inventory Sync Enabled |
|----|------|----------------------|
| `nationwide-plants-config` | Nationwide Plants | ❌ |
| `test-store` | Test Retail Store | ❌ |

## Usage

When manually triggering the inventory sync workflow, you can select from the above retailers or choose "all" to process all retailers with inventory sync enabled.

## Adding New Retailers

1. Add a new retailer config file to `config/retailers/`
2. Run `node scripts/generate-workflow-inputs.js` to update the workflow
3. Commit the updated workflow file

The workflow will automatically include the new retailer in the dropdown options.
