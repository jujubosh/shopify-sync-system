const { DatabaseService } = require('./utils/database-service');
const fs = require('fs');
const path = require('path');

async function createRetailers() {
  const dbService = new DatabaseService();
  
  try {
    console.log('Creating retailer database entries...');
    
    // Get all retailer config files
    const retailersDir = path.join(__dirname, '../config/retailers');
    const configFiles = fs.readdirSync(retailersDir).filter(file => file.endsWith('.json'));
    
    console.log(`Found ${configFiles.length} retailer config files`);
    
    // Track used domains to handle duplicates
    const usedDomains = new Set();
    
    for (const configFile of configFiles) {
      const configPath = path.join(retailersDir, configFile);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      console.log(`\nProcessing ${config.name}...`);
      
      // Generate a unique ID for the retailer
      const retailerId = config.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
      
      // Handle duplicate domains by adding a suffix
      let domain = config.domain;
      if (usedDomains.has(domain)) {
        const suffix = config.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        domain = `${domain}-${suffix}`;
        console.log(`⚠️  Domain conflict detected. Using modified domain: ${domain}`);
      }
      usedDomains.add(domain);
      
      // Create retailer data matching the database schema
      const retailerData = {
        id: retailerId,
        name: config.name,
        domain: domain,
        api_token: config.apiToken,
        target_location_id: config.targetLocationId || null,
        lgl_location_id: config.lglLocationId || null,
        enabled: config.settings?.enabled ?? true,
        import_orders: config.settings?.importOrders ?? true,
        push_fulfillments: config.settings?.pushFulfillments ?? true,
        sync_inventory: config.settings?.syncInventory ?? false,
        lookback_hours: config.settings?.lookbackHours ?? 6,
        fulfillment_lookback_hours: config.settings?.fulfillmentLookbackHours ?? 24,
        custom_include_note: config.settings?.customFields?.includeNote ?? false,
        custom_include_tags: config.settings?.customFields?.includeTags ?? false,
        billing_email: config.billingAddress?.email || null,
        billing_first_name: config.billingAddress?.first_name || config.billingAddress?.firstName || null,
        billing_last_name: config.billingAddress?.last_name || config.billingAddress?.lastName || null,
        billing_phone: config.billingAddress?.phone || null,
        billing_address1: config.billingAddress?.address1 || null,
        billing_address2: config.billingAddress?.address2 || null,
        billing_city: config.billingAddress?.city || null,
        billing_province: config.billingAddress?.province || null,
        billing_zip: config.billingAddress?.zip || null,
        billing_country: config.billingAddress?.country || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      try {
        // Check if retailer already exists by domain
        try {
          const existingRetailer = await dbService.getRetailerByDomain(domain);
          console.log(`⚠️  Retailer with domain ${domain} already exists. Skipping...`);
          continue;
        } catch (error) {
          // Retailer doesn't exist, proceed with creation
        }
        
        const retailer = await dbService.createRetailer(retailerData);
        console.log(`✅ Created ${config.name} retailer with ID: ${retailer.id}`);
      } catch (error) {
        console.error(`❌ Failed to create ${config.name}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Finished processing all retailer config files!');
    
  } catch (error) {
    console.error('❌ Error creating retailers:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createRetailers();
}

module.exports = { createRetailers }; 