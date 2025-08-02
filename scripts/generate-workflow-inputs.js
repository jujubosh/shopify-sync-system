const fs = require('fs');
const path = require('path');

function loadRetailers() {
  const retailersDir = path.join(__dirname, '../config/retailers');
  const files = fs.readdirSync(retailersDir).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const retailer = JSON.parse(fs.readFileSync(path.join(retailersDir, file), 'utf8'));
    retailer.id = file.replace('.json', '');
    return retailer;
  });
}

function generateWorkflowYaml() {
  const retailers = loadRetailers();
  
  // Generate options array for the workflow
  const options = ['all', ...retailers.map(r => r.id)];
  
  // Create the workflow YAML content
  const workflowContent = `name: Inventory Sync

on:
  schedule:
    # Run inventory sync every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch:
    inputs:
      retailer:
        description: 'Specific retailer to process (leave empty for all)'
        required: false
        type: choice
        options:
${options.map(option => `          - ${option}`).join('\n')}

jobs:
  inventory-sync:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Create logs directory
      run: mkdir -p logs
      
    - name: Run Inventory Sync
      env:
        MAILGUN_API_KEY: \${{ secrets.MAILGUN_API_KEY }}
        MAILGUN_DOMAIN: \${{ secrets.MAILGUN_DOMAIN }}
        SHOPIFY_LGL_TOKEN: \${{ secrets.SHOPIFY_LGL_TOKEN }}
        SHOPIFY_NATIONWIDE_PLANTS_TOKEN: \${{ secrets.SHOPIFY_NATIONWIDE_PLANTS_TOKEN }}
        SHOPIFY_TEST_TOKEN: \${{ secrets.SHOPIFY_TEST_TOKEN }}
        EMAIL_FROM: admin@livegoodlogistics.com
        EMAIL_TO: justin@livegoodlogistics.com
        LOG_LEVEL: info
        SUPABASE_URL: \${{ secrets.SUPABASE_URL }}
        SUPABASE_ANON_KEY: \${{ secrets.SUPABASE_ANON_KEY }}
        RETAILER_ID: \${{ github.event.inputs.retailer != 'all' && github.event.inputs.retailer || '' }}
      run: |
        echo "Running inventory sync"
        if [ -n "$RETAILER_ID" ]; then
          echo "Processing specific retailer: $RETAILER_ID"
        else
          echo "Processing all retailers with inventory sync enabled"
        fi
        
        node scripts/process-inventory.js
        
    - name: Upload logs
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: inventory-sync-logs-\${{ github.run_id }}
        path: logs/
        retention-days: 7
        
    - name: Notify on failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: \${{ job.status }}
        channel: '#alerts'
      env:
        SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK_URL }}
`;

  // Write the generated workflow file
  const workflowPath = path.join(__dirname, '../.github/workflows/inventory-sync.yml');
  fs.writeFileSync(workflowPath, workflowContent);
  
  console.log('✅ Generated inventory workflow with dynamic retailer options:');
  console.log('Available retailers:', retailers.map(r => `${r.id} (${r.name})`).join(', '));
  console.log('Total options:', options.length);
}

// Also generate a documentation file with current retailers
function generateRetailerDocs() {
  const retailers = loadRetailers();
  
  const docsContent = `# Available Retailers for Inventory Sync

This file is auto-generated from retailer configs. Last updated: ${new Date().toISOString()}

## Retailer Options

| ID | Name | Inventory Sync Enabled |
|----|------|----------------------|
${retailers.map(r => `| \`${r.id}\` | ${r.name} | ${r.settings?.syncInventory ? '✅' : '❌'} |`).join('\n')}

## Usage

When manually triggering the inventory sync workflow, you can select from the above retailers or choose "all" to process all retailers with inventory sync enabled.

## Adding New Retailers

1. Add a new retailer config file to \`config/retailers/\`
2. Run \`node scripts/generate-workflow-inputs.js\` to update the workflow
3. Commit the updated workflow file

The workflow will automatically include the new retailer in the dropdown options.
`;

  const docsPath = path.join(__dirname, '../RETAILER_OPTIONS.md');
  fs.writeFileSync(docsPath, docsContent);
  
  console.log('✅ Generated retailer documentation');
}

if (require.main === module) {
  try {
    generateWorkflowYaml();
    generateRetailerDocs();
    console.log('\n🎉 Workflow generation completed successfully!');
  } catch (error) {
    console.error('❌ Error generating workflow:', error.message);
    process.exit(1);
  }
}

module.exports = { generateWorkflowYaml, generateRetailerDocs }; 