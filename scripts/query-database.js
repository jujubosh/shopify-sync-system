require('dotenv').config();
const { supabase, TABLES } = require('../config/database');

async function queryDatabase() {
  console.log('🔍 Querying Supabase database...\n');

  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from(TABLES.ACTIVITY_LOGS)
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Get recent activity logs
    console.log('📋 Recent Activity Logs:');
    const { data: activityLogs, error: activityError } = await supabase
      .from(TABLES.ACTIVITY_LOGS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (activityError) {
      console.error('❌ Error fetching activity logs:', activityError);
      return;
    }

    if (activityLogs && activityLogs.length > 0) {
      console.log(`Found ${activityLogs.length} activity logs:\n`);
      activityLogs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.operation} - ${log.success ? '✅ Success' : '❌ Failed'} - ${log.created_at}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
        console.log('');
      });
    } else {
      console.log('📭 No activity logs found in database');
    }

    // Get email notifications
    console.log('📧 Recent Email Notifications:');
    const { data: emailLogs, error: emailError } = await supabase
      .from(TABLES.EMAIL_NOTIFICATIONS)
      .select('*')
      .limit(5);

    if (emailError) {
      console.error('❌ Error fetching email logs:', emailError);
      console.log('📝 Email notifications table schema issue - created_at column may not exist');
    } else if (emailLogs && emailLogs.length > 0) {
      console.log(`Found ${emailLogs.length} email notifications:\n`);
      emailLogs.forEach((log, index) => {
        console.log(`${index + 1}. ${log.type} - ${log.subject}`);
        console.log(`   Body: ${log.body?.substring(0, 100)}...`);
      });
    } else {
      console.log('📭 No email notifications found in database');
    }

    // Get sync jobs
    console.log('\n🔄 Recent Sync Jobs:');
    const { data: syncJobs, error: syncError } = await supabase
      .from(TABLES.SYNC_JOBS)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (syncError) {
      console.error('❌ Error fetching sync jobs:', syncError);
      return;
    }

    if (syncJobs && syncJobs.length > 0) {
      console.log(`Found ${syncJobs.length} sync jobs:\n`);
      syncJobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.operation_type} - ${job.status} - ${job.created_at}`);
      });
    } else {
      console.log('📭 No sync jobs found in database');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

queryDatabase(); 