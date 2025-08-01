#!/usr/bin/env node

/**
 * Database setup script for Supabase
 * Creates all necessary tables and indexes
 */

const { supabase, TABLES } = require('../config/database');

async function setupDatabase() {
  console.log('🗄️  Setting up database schema...\n');

  try {
    // Note: Tables need to be created manually in Supabase dashboard
    // This script will verify table access and create indexes if possible
    
    console.log('Verifying table access...');
    
    // Test access to retailers table
    const { error: retailersError } = await supabase
      .from(TABLES.RETAILERS)
      .select('id')
      .limit(1);
    
    if (retailersError && retailersError.message.includes('does not exist')) {
      console.log('❌ Retailers table does not exist');
      console.log('Please create the tables manually in your Supabase dashboard:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to Table Editor');
      console.log('3. Create the following tables:');
      console.log('   - retailers');
      console.log('   - sync_jobs');
      console.log('   - email_notifications');
      console.log('   - activity_logs');
      console.log('\nSee DATABASE_SETUP.md for the exact SQL schema');
      return;
    } else if (retailersError) {
      console.log('⚠️  Retailers table access issue:', retailersError.message);
    } else {
      console.log('✅ Retailers table accessible');
    }

    // Test access to sync_jobs table
    const { error: syncJobsError } = await supabase
      .from(TABLES.SYNC_JOBS)
      .select('id')
      .limit(1);
    
    if (syncJobsError && syncJobsError.message.includes('does not exist')) {
      console.log('❌ Sync jobs table does not exist');
    } else if (syncJobsError) {
      console.log('⚠️  Sync jobs table access issue:', syncJobsError.message);
    } else {
      console.log('✅ Sync jobs table accessible');
    }

    // Test access to email_notifications table
    const { error: emailError } = await supabase
      .from(TABLES.EMAIL_NOTIFICATIONS)
      .select('id')
      .limit(1);
    
    if (emailError && emailError.message.includes('does not exist')) {
      console.log('❌ Email notifications table does not exist');
    } else if (emailError) {
      console.log('⚠️  Email notifications table access issue:', emailError.message);
    } else {
      console.log('✅ Email notifications table accessible');
    }

    // Test access to activity_logs table
    const { error: activityError } = await supabase
      .from(TABLES.ACTIVITY_LOGS)
      .select('id')
      .limit(1);
    
    if (activityError && activityError.message.includes('does not exist')) {
      console.log('❌ Activity logs table does not exist');
    } else if (activityError) {
      console.log('⚠️  Activity logs table access issue:', activityError.message);
    } else {
      console.log('✅ Activity logs table accessible');
    }

    console.log('\n📋 Manual Table Creation Required');
    console.log('Please create the following tables in your Supabase dashboard:');
    console.log('\n1. Go to: https://supabase.com/dashboard/project/orvuhoexqgumpwynchay/editor');
    console.log('2. Click "New table" for each table below');
    console.log('\n=== RETAILERS TABLE ===');
    console.log('Name: retailers');
    console.log('Columns:');
    console.log('  - id (uuid, primary key)');
    console.log('  - name (text, not null)');
    console.log('  - domain (text, not null, unique)');
    console.log('  - api_token (text, not null)');
    console.log('  - target_location_id (text)');
    console.log('  - settings (jsonb, default: {})');
    console.log('  - enabled (boolean, default: true)');
    console.log('  - created_at (timestamp with time zone, default: now())');
    console.log('  - updated_at (timestamp with time zone, default: now())');
    
    console.log('\n=== SYNC_JOBS TABLE ===');
    console.log('Name: sync_jobs');
    console.log('Columns:');
    console.log('  - id (uuid, primary key)');
    console.log('  - retailer_id (uuid, foreign key to retailers.id)');
    console.log('  - operation_type (text, not null)');
    console.log('  - status (text, default: pending)');
    console.log('  - results (jsonb, default: {})');
    console.log('  - error_message (text)');
    console.log('  - started_at (timestamp with time zone)');
    console.log('  - completed_at (timestamp with time zone)');
    console.log('  - created_at (timestamp with time zone, default: now())');
    
    console.log('\n=== EMAIL_NOTIFICATIONS TABLE ===');
    console.log('Name: email_notifications');
    console.log('Columns:');
    console.log('  - id (uuid, primary key)');
    console.log('  - type (text, not null)');
    console.log('  - recipient (text, not null)');
    console.log('  - subject (text, not null)');
    console.log('  - body (text)');
    console.log('  - html_body (text)');
    console.log('  - sent_at (timestamp with time zone, default: now())');
    console.log('  - status (text, default: sent)');
    
    console.log('\n=== ACTIVITY_LOGS TABLE ===');
    console.log('Name: activity_logs');
    console.log('Columns:');
    console.log('  - id (uuid, primary key)');
    console.log('  - retailer_id (uuid, foreign key to retailers.id)');
    console.log('  - operation (text, not null)');
    console.log('  - success (boolean, not null)');
    console.log('  - details (jsonb, default: {})');
    console.log('  - duration_ms (integer)');
    console.log('  - created_at (timestamp with time zone, default: now())');

    console.log('\nAfter creating the tables, run:');
    console.log('npm run test-db');
    console.log('npm run migrate');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 