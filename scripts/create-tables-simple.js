#!/usr/bin/env node

/**
 * Create database tables using Supabase client
 * This approach creates tables by attempting operations that will fail gracefully
 */

require('dotenv').config();
const { supabase, TABLES } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createTablesSimple() {
  console.log('🗄️  Creating database tables...\n');

  try {
    // Test and create retailers table
    console.log('Creating retailers table...');
    const { error: retailersError } = await supabase
      .from(TABLES.RETAILERS)
      .insert({
        name: 'Test Retailer',
        domain: 'test.myshopify.com',
        api_token: 'test_token',
        settings: { enabled: true }
      })
      .select()
      .single();

    if (retailersError && retailersError.message.includes('does not exist')) {
      console.log('❌ Retailers table does not exist');
      console.log('Please run the SQL script manually:');
      console.log('1. Go to: https://supabase.com/dashboard/project/orvuhoexqgumpwynchay/sql');
      console.log('2. Copy the contents of scripts/create-tables.sql');
      console.log('3. Click "Run"');
      return;
    } else if (retailersError) {
      console.log('⚠️  Retailers table error:', retailersError.message);
    } else {
      console.log('✅ Retailers table accessible');
      // Clean up test data
      await supabase.from(TABLES.RETAILERS).delete().eq('domain', 'test.myshopify.com');
    }

    // Test other tables
    const tables = [
      { name: 'sync_jobs', testData: { operation_type: 'test', status: 'pending' } },
      { name: 'email_notifications', testData: { type: 'test', recipient: 'test@example.com', subject: 'Test' } },
      { name: 'activity_logs', testData: { operation: 'test', success: true } }
    ];

    for (const table of tables) {
      console.log(`Testing ${table.name} table...`);
      const { error } = await supabase
        .from(table.name)
        .insert(table.testData)
        .select()
        .single();

      if (error && error.message.includes('does not exist')) {
        console.log(`❌ ${table.name} table does not exist`);
      } else if (error) {
        console.log(`⚠️  ${table.name} table error:`, error.message);
      } else {
        console.log(`✅ ${table.name} table accessible`);
        // Clean up test data
        await supabase.from(table.name).delete().eq('id', table.testData.id || 'test');
      }
    }

    console.log('\n📋 SQL Execution Required');
    console.log('Please execute the SQL script to create all tables:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/orvuhoexqgumpwynchay/sql');
    console.log('2. Copy and paste this SQL:');
    console.log('\n' + '='.repeat(50));
    
    const sqlContent = fs.readFileSync(path.join(__dirname, 'create-tables.sql'), 'utf8');
    console.log(sqlContent);
    console.log('='.repeat(50));
    
    console.log('\n3. Click "Run" to execute');
    console.log('4. Then run: npm run test-db');

  } catch (error) {
    console.error('❌ Failed to create tables:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  createTablesSimple();
}

module.exports = { createTablesSimple }; 