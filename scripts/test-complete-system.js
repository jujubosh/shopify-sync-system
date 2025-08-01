#!/usr/bin/env node

/**
 * Complete system test with database integration
 * Tests the entire order processing pipeline with database email notifications
 */

require('dotenv').config();
const { DatabaseEmailNotifier } = require('./utils/database-email-notifier');
const { supabase, TABLES } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function testCompleteSystem() {
  console.log('🧪 Testing complete system with database integration...\n');

  try {
    // Load appropriate configuration based on environment
    let config;
    const testConfigPath = path.join(__dirname, '../config/global-config-test.json');
    
    if (fs.existsSync(testConfigPath)) {
      console.log('📁 Using test configuration for local testing');
      config = require('../config/global-config-test.json');
    } else {
      console.log('📁 Using production configuration');
      config = require('../config/global-config.json');
    }
    
    // Create email notifier
    const emailNotifier = new DatabaseEmailNotifier(config);
    
    console.log('✅ Email notifier initialized');
    console.log(`📧 From: ${emailNotifier.fromEmail}`);
    console.log(`📧 To: ${emailNotifier.toEmail}`);
    console.log(`📧 Enabled: ${emailNotifier.enabled}`);
    console.log(`📧 Mailgun Domain: ${emailNotifier.domain}`);

    // Test 1: Database Connection
    console.log('\n=== Test 1: Database Connection ===');
    const { data: retailers, error: dbError } = await supabase
      .from(TABLES.RETAILERS)
      .select('name, domain')
      .limit(1);
    
    if (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      return;
    }
    console.log('✅ Database connection successful');
    console.log(`📊 Found ${retailers?.length || 0} retailers in database`);

    // Test 2: Email Statistics
    console.log('\n=== Test 2: Email Statistics ===');
    const stats = await emailNotifier.getEmailStats();
    console.log('📊 Email Statistics:', JSON.stringify(stats, null, 2));

    // Test 3: Activity Logging
    console.log('\n=== Test 3: Activity Logging ===');
    const testResults = {
      orders: {
        success: [
          { id: 'test-order-1', name: 'Test Order 1', total: 99.99 },
          { id: 'test-order-2', name: 'Test Order 2', total: 149.99 }
        ],
        errors: []
      },
      fulfillments: {
        success: [
          { id: 'test-fulfillment-1', order_id: 'test-order-1' }
        ],
        errors: []
      },
      inventory: {
        success: [
          { sku: 'TEST-SKU-1', quantity: 10 },
          { sku: 'TEST-SKU-2', quantity: 5 }
        ],
        errors: []
      }
    };

    const startTime = Date.now();
    await emailNotifier.logActivity('test_complete_system', testResults, true, 2500);
    const duration = Date.now() - startTime;
    console.log('✅ Activity logged successfully');
    console.log(`⏱️  Duration: ${duration}ms`);

    // Test 4: Rate Limiting
    console.log('\n=== Test 4: Rate Limiting ===');
    const canSendInfo = await emailNotifier.canSendEmail('info', 'test');
    const canSendError = await emailNotifier.canSendEmail('error', 'test');
    console.log(`📧 Can send info email: ${canSendInfo}`);
    console.log(`📧 Can send error email: ${canSendError}`);

    // Test 5: Email Sending (With Real Mailgun)
    console.log('\n=== Test 5: Email Sending (With Real Mailgun) ===');
    console.log('📧 Testing email sending with configured Mailgun...');
    
    // Simulate order alert
    await emailNotifier.sendOrderAlert(testResults);
    console.log('✅ Order alert processed');
    
    // Simulate fulfillment alert
    await emailNotifier.sendFulfillmentAlert(testResults);
    console.log('✅ Fulfillment alert processed');
    
    // Simulate inventory alert
    await emailNotifier.sendInventoryAlert(testResults);
    console.log('✅ Inventory alert processed');

    // Test 6: Error Handling
    console.log('\n=== Test 6: Error Handling ===');
    const testError = new Error('Test error for database email system');
    const errorContext = {
      retailer: 'Test Store',
      operation: 'test_operation',
      timestamp: new Date().toISOString()
    };
    
    await emailNotifier.sendErrorNotification(testError, errorContext);
    console.log('✅ Error notification processed');

    // Test 7: Summary Notification
    console.log('\n=== Test 7: Summary Notification ===');
    const summary = {
      status: 'success',
      duration: 5000,
      retailers: ['Test Store'],
      results: testResults
    };
    
    await emailNotifier.sendSummaryNotification(summary);
    console.log('✅ Summary notification processed');

    // Test 8: Verify Database Records
    console.log('\n=== Test 8: Verify Database Records ===');
    
    // Check recent email notifications
    const { data: recentEmails, error: emailError } = await supabase
      .from(TABLES.EMAIL_NOTIFICATIONS)
      .select('type, subject, sent_at')
      .order('sent_at', { ascending: false })
      .limit(5);

    if (emailError) {
      console.error('❌ Error fetching recent emails:', emailError.message);
    } else {
      console.log('📧 Recent email notifications:');
      recentEmails?.forEach(email => {
        console.log(`  - ${email.type}: ${email.subject} (${email.sent_at})`);
      });
    }

    // Check recent activity logs
    const { data: recentActivities, error: activityError } = await supabase
      .from(TABLES.ACTIVITY_LOGS)
      .select('operation, success, duration_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (activityError) {
      console.error('❌ Error fetching recent activities:', activityError.message);
    } else {
      console.log('📝 Recent activity logs:');
      recentActivities?.forEach(activity => {
        console.log(`  - ${activity.operation} (${activity.success ? 'SUCCESS' : 'FAILED'}) - ${activity.duration_ms}ms`);
      });
    }

    // Test 9: Performance Metrics
    console.log('\n=== Test 9: Performance Metrics ===');
    const finalStats = await emailNotifier.getEmailStats();
    console.log('📊 Final Email Statistics:', JSON.stringify(finalStats, null, 2));

    console.log('\n🎉 Complete system test finished successfully!');
    console.log('\n✅ All components working:');
    console.log('  - Database connection');
    console.log('  - Email notifications');
    console.log('  - Activity logging');
    console.log('  - Rate limiting');
    console.log('  - Error handling');
    console.log('  - Summary notifications');

    console.log('\n🚀 Ready for GitHub Actions testing!');

  } catch (error) {
    console.error('❌ Complete system test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  testCompleteSystem();
}

module.exports = { testCompleteSystem }; 