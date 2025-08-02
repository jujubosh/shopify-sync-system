const { supabase, TABLES } = require('../config/database.js');

async function checkDatabase() {
  console.log('🔍 Checking recent inventory sync activity...\n');
  
  // Check recent activity logs
  console.log('📊 Recent Activity Logs:');
  const { data: activityLogs, error: activityError } = await supabase
    .from(TABLES.ACTIVITY_LOGS)
    .select('*')
    .eq('operation', 'inventory')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (activityError) {
    console.error('Error fetching activity logs:', activityError);
  } else {
    if (activityLogs.length === 0) {
      console.log('   No inventory activity logs found');
    } else {
      activityLogs.forEach(log => {
        console.log(`\n📅 ${new Date(log.created_at).toLocaleString()}`);
        console.log(`   Operation: ${log.operation}`);
        console.log(`   Success: ${log.success}`);
        console.log(`   Duration: ${log.duration_ms ? log.duration_ms + 'ms' : 'N/A'}`);
        console.log(`   Details: ${JSON.stringify(log.details, null, 2)}`);
      });
    }
  }
  
  console.log('\n📧 Recent Email Notifications:');
  const { data: emailLogs, error: emailError } = await supabase
    .from(TABLES.EMAIL_NOTIFICATIONS)
    .select('*')
    .eq('type', 'inventory')
    .order('sent_at', { ascending: false })
    .limit(3);
    
  if (emailError) {
    console.error('Error fetching email logs:', emailError);
  } else {
    if (emailLogs.length === 0) {
      console.log('   No inventory email notifications found');
    } else {
      emailLogs.forEach(email => {
        console.log(`\n📅 ${new Date(email.sent_at).toLocaleString()}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Recipient: ${email.recipient}`);
        console.log(`   Operation: ${email.operation}`);
      });
    }
  }
  
  // Summary stats
  console.log('\n📈 Summary Statistics (Last 7 Days):');
  const { data: summaryStats, error: summaryError } = await supabase
    .from(TABLES.ACTIVITY_LOGS)
    .select('success, created_at')
    .eq('operation', 'inventory')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days
    
  if (summaryError) {
    console.error('Error fetching summary stats:', summaryError);
  } else {
    const totalRuns = summaryStats.length;
    const successfulRuns = summaryStats.filter(log => log.success).length;
    const successRate = totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : 0;
    
    console.log(`   Total runs: ${totalRuns}`);
    console.log(`   Successful runs: ${successfulRuns}`);
    console.log(`   Success rate: ${successRate}%`);
  }
}

checkDatabase().catch(console.error); 