#!/usr/bin/env node

/**
 * Data migration script
 * Migrates existing retailer configurations from files to database
 */

const fs = require('fs');
const path = require('path');
const { supabase, TABLES } = require('../config/database');

async function migrateData() {
  console.log('🔄 Starting data migration...\n');

  try {
    // Migrate retailer configurations
    console.log('Migrating retailer configurations...');
    await migrateRetailers();

    // Migrate email state
    console.log('Migrating email state...');
    await migrateEmailState();

    console.log('\n✅ Data migration completed successfully!');

  } catch (error) {
    console.error('❌ Data migration failed:', error);
    process.exit(1);
  }
}

async function migrateRetailers() {
  const retailersDir = path.join(__dirname, '../config/retailers');
  
  if (!fs.existsSync(retailersDir)) {
    console.log('No retailers directory found, skipping retailer migration');
    return;
  }

  const files = fs.readdirSync(retailersDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const retailerId = file.replace('.json', '');
    const filePath = path.join(retailersDir, file);
    const retailerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check if retailer already exists in database
    const { data: existing } = await supabase
      .from(TABLES.RETAILERS)
      .select('id')
      .eq('domain', retailerData.domain)
      .single();

    if (existing) {
      console.log(`  ⏭️  Retailer ${retailerData.name} already exists in database`);
      continue;
    }

    // Insert retailer into database
    const { data, error } = await supabase
      .from(TABLES.RETAILERS)
      .insert({
        name: retailerData.name,
        domain: retailerData.domain,
        api_token: retailerData.apiToken,
        target_location_id: retailerData.lglLocationId || retailerData.targetLocationId,
        settings: {
          enabled: retailerData.settings?.enabled ?? true,
          importOrders: retailerData.settings?.importOrders ?? true,
          pushFulfillments: retailerData.settings?.pushFulfillments ?? true,
          syncInventory: retailerData.settings?.syncInventory ?? true,
          customFields: retailerData.settings?.customFields ?? {},
          lookbackHours: retailerData.settings?.lookbackHours ?? 6,
          fulfillmentLookbackHours: retailerData.settings?.fulfillmentLookbackHours ?? 24,
          billingAddress: retailerData.billingAddress
        }
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Failed to migrate retailer ${retailerData.name}:`, error.message);
    } else {
      console.log(`  ✅ Migrated retailer ${retailerData.name} (ID: ${data.id})`);
    }
  }
}

async function migrateEmailState() {
  const emailStateFile = path.join(__dirname, '../logs/email-state.json');
  
  if (!fs.existsSync(emailStateFile)) {
    console.log('No email state file found, skipping email state migration');
    return;
  }

  try {
    const emailState = JSON.parse(fs.readFileSync(emailStateFile, 'utf8'));
    
    // Migrate email notifications
    if (emailState.lastEmailTimes) {
      console.log('  Migrating email notification history...');
      
      for (const [key, timestamp] of Object.entries(emailState.lastEmailTimes)) {
        const [type, operation] = key.split('_');
        
        // Create a record of the last email sent
        const { error } = await supabase
          .from(TABLES.EMAIL_NOTIFICATIONS)
          .insert({
            type: type,
            recipient: 'admin@yourcompany.com', // Default recipient
            subject: `Migration: ${operation} notification`,
            body: `Migrated from file-based state. Last sent at ${new Date(timestamp).toISOString()}`,
            sent_at: new Date(timestamp).toISOString(),
            status: 'sent'
          });

        if (error) {
          console.log(`    ⚠️  Could not migrate email record for ${key}:`, error.message);
        }
      }
    }

    // Migrate activity history
    if (emailState.activityHistory && emailState.activityHistory.length > 0) {
      console.log('  Migrating activity history...');
      
      for (const activity of emailState.activityHistory) {
        const { error } = await supabase
          .from(TABLES.ACTIVITY_LOGS)
          .insert({
            operation: activity.operation,
            success: activity.success,
            details: activity.results || {},
            created_at: activity.timestamp
          });

        if (error) {
          console.log(`    ⚠️  Could not migrate activity record:`, error.message);
        }
      }
    }

    console.log('  ✅ Email state migration completed');

  } catch (error) {
    console.log('  ⚠️  Email state migration failed:', error.message);
  }
}

// Run the migration if called directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData }; 