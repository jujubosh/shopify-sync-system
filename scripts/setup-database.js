#!/usr/bin/env node

/**
 * Database setup script for Supabase
 * Creates all necessary tables and indexes
 */

const { supabase, TABLES } = require('../config/database');

async function setupDatabase() {
  console.log('🗄️  Setting up database schema...\n');

  try {
    // Create retailers table
    console.log('Creating retailers table...');
    const { error: retailersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${TABLES.RETAILERS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          domain VARCHAR(255) NOT NULL UNIQUE,
          api_token VARCHAR(255) NOT NULL,
          target_location_id VARCHAR(255),
          settings JSONB DEFAULT '{}',
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (retailersError) {
      console.log('Retailers table already exists or error:', retailersError.message);
    } else {
      console.log('✅ Retailers table created');
    }

    // Create sync_jobs table
    console.log('Creating sync_jobs table...');
    const { error: syncJobsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${TABLES.SYNC_JOBS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          retailer_id UUID REFERENCES ${TABLES.RETAILERS}(id),
          operation_type VARCHAR(50) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          results JSONB DEFAULT '{}',
          error_message TEXT,
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (syncJobsError) {
      console.log('Sync jobs table already exists or error:', syncJobsError.message);
    } else {
      console.log('✅ Sync jobs table created');
    }

    // Create email_notifications table
    console.log('Creating email_notifications table...');
    const { error: emailError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${TABLES.EMAIL_NOTIFICATIONS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          type VARCHAR(50) NOT NULL,
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(500) NOT NULL,
          body TEXT,
          html_body TEXT,
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          status VARCHAR(50) DEFAULT 'sent'
        );
      `
    });

    if (emailError) {
      console.log('Email notifications table already exists or error:', emailError.message);
    } else {
      console.log('✅ Email notifications table created');
    }

    // Create activity_logs table
    console.log('Creating activity_logs table...');
    const { error: activityError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${TABLES.ACTIVITY_LOGS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          retailer_id UUID REFERENCES ${TABLES.RETAILERS}(id),
          operation VARCHAR(50) NOT NULL,
          success BOOLEAN NOT NULL,
          details JSONB DEFAULT '{}',
          duration_ms INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (activityError) {
      console.log('Activity logs table already exists or error:', activityError.message);
    } else {
      console.log('✅ Activity logs table created');
    }

    // Create indexes
    console.log('Creating indexes...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_sync_jobs_retailer_status ON ${TABLES.SYNC_JOBS}(retailer_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON ${TABLES.SYNC_JOBS}(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_retailer_created ON ${TABLES.ACTIVITY_LOGS}(retailer_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON ${TABLES.EMAIL_NOTIFICATIONS}(sent_at)`
    ];

    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError) {
        console.log('Index creation error:', indexError.message);
      }
    }

    console.log('✅ All indexes created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/migrate-data.js');
    console.log('2. Update your environment variables with Supabase credentials');
    console.log('3. Test the database connection');

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