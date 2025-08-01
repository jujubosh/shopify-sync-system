#!/usr/bin/env node

/**
 * Database connection test script
 * Verifies Supabase connection and basic operations
 */

require('dotenv').config();
const { supabase, TABLES } = require('../config/database');

async function testDatabase() {
  console.log('🧪 Testing database connection...\n');

  try {
    // Test basic connection
    console.log('Testing connection...');
    const { data, error } = await supabase
      .from(TABLES.RETAILERS)
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Check your SUPABASE_URL and SUPABASE_ANON_KEY in .env');
      console.log('2. Make sure your Supabase project is active');
      console.log('3. Verify your IP is allowed in Supabase dashboard');
      return;
    }

    console.log('✅ Database connection successful');

    // Test table existence
    console.log('\nTesting table access...');
    const tables = [TABLES.RETAILERS, TABLES.SYNC_JOBS, TABLES.EMAIL_NOTIFICATIONS, TABLES.ACTIVITY_LOGS];
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log(`  ⚠️  Table ${table}: ${tableError.message}`);
      } else {
        console.log(`  ✅ Table ${table}: accessible`);
      }
    }

    // Test insert/select operations
    console.log('\nTesting basic operations...');
    const testData = {
      name: 'Test Retailer',
      domain: 'test.myshopify.com',
      api_token: 'test_token',
      settings: { enabled: true }
    };

    const { data: insertData, error: insertError } = await supabase
      .from(TABLES.RETAILERS)
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.log(`  ⚠️  Insert test failed: ${insertError.message}`);
    } else {
      console.log('  ✅ Insert operation successful');
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from(TABLES.RETAILERS)
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.log(`  ⚠️  Cleanup failed: ${deleteError.message}`);
      } else {
        console.log('  ✅ Delete operation successful');
      }
    }

    console.log('\n🎉 Database test completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Run: node scripts/setup-database.js');
    console.log('2. Run: node scripts/migrate-data.js');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

// Run the test if called directly
if (require.main === module) {
  testDatabase();
}

module.exports = { testDatabase }; 