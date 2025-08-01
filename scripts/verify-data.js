#!/usr/bin/env node

/**
 * Verify migrated data in the database
 */

require('dotenv').config();
const { supabase, TABLES } = require('../config/database');

async function verifyData() {
  console.log('🔍 Verifying migrated data...\n');

  try {
    // Check retailers table
    console.log('=== RETAILERS TABLE ===');
    const { data: retailers, error: retailersError } = await supabase
      .from(TABLES.RETAILERS)
      .select('*')
      .order('created_at', { ascending: false });

    if (retailersError) {
      console.error('❌ Error fetching retailers:', retailersError.message);
    } else {
      console.log(`Found ${retailers.length} retailers:`);
      retailers.forEach(retailer => {
        console.log(`  - ${retailer.name} (${retailer.domain})`);
        console.log(`    ID: ${retailer.id}`);
        console.log(`    Enabled: ${retailer.enabled}`);
        console.log(`    Settings: ${JSON.stringify(retailer.settings)}`);
        console.log('');
      });
    }

    // Check email notifications table
    console.log('=== EMAIL NOTIFICATIONS TABLE ===');
    const { data: emails, error: emailsError } = await supabase
      .from(TABLES.EMAIL_NOTIFICATIONS)
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(10);

    if (emailsError) {
      console.error('❌ Error fetching email notifications:', emailsError.message);
    } else {
      console.log(`Found ${emails.length} email notifications:`);
      emails.forEach(email => {
        console.log(`  - ${email.type}: ${email.subject}`);
        console.log(`    Recipient: ${email.recipient}`);
        console.log(`    Sent: ${email.sent_at}`);
        console.log('');
      });
    }

    // Check activity logs table
    console.log('=== ACTIVITY LOGS TABLE ===');
    const { data: activities, error: activitiesError } = await supabase
      .from(TABLES.ACTIVITY_LOGS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) {
      console.error('❌ Error fetching activity logs:', activitiesError.message);
    } else {
      console.log(`Found ${activities.length} activity logs:`);
      activities.forEach(activity => {
        console.log(`  - ${activity.operation} (${activity.success ? 'SUCCESS' : 'FAILED'})`);
        console.log(`    Created: ${activity.created_at}`);
        if (activity.duration_ms) {
          console.log(`    Duration: ${activity.duration_ms}ms`);
        }
        console.log('');
      });
    }

    // Check sync jobs table
    console.log('=== SYNC JOBS TABLE ===');
    const { data: jobs, error: jobsError } = await supabase
      .from(TABLES.SYNC_JOBS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('❌ Error fetching sync jobs:', jobsError.message);
    } else {
      console.log(`Found ${jobs.length} sync jobs:`);
      jobs.forEach(job => {
        console.log(`  - ${job.operation_type} (${job.status})`);
        console.log(`    Created: ${job.created_at}`);
        if (job.error_message) {
          console.log(`    Error: ${job.error_message}`);
        }
        console.log('');
      });
    }

    console.log('✅ Data verification complete!');

  } catch (error) {
    console.error('❌ Data verification failed:', error);
  }
}

// Run the verification if called directly
if (require.main === module) {
  verifyData();
}

module.exports = { verifyData }; 