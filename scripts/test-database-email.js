#!/usr/bin/env node

/**
 * Test the database-based email notifier
 */

require('dotenv').config();
const { DatabaseEmailNotifier } = require('./utils/database-email-notifier');

async function testDatabaseEmail() {
  console.log('🧪 Testing database-based email notifier...\n');

  try {
    // Load config
    const config = require('../config/global-config.json');
    
    // Create email notifier
    const emailNotifier = new DatabaseEmailNotifier(config);
    
    console.log('✅ Email notifier created successfully');
    console.log(`📧 From: ${emailNotifier.fromEmail}`);
    console.log(`📧 To: ${emailNotifier.toEmail}`);
    console.log(`📧 Enabled: ${emailNotifier.enabled}`);
    
    // Test email stats
    console.log('\n📊 Getting email statistics...');
    const stats = await emailNotifier.getEmailStats();
    console.log('Email stats:', JSON.stringify(stats, null, 2));
    
    // Test activity logging
    console.log('\n📝 Testing activity logging...');
    const testResults = {
      orders: {
        success: [{ id: 'test-order-1' }, { id: 'test-order-2' }],
        errors: []
      },
      fulfillments: {
        success: [{ id: 'test-fulfillment-1' }],
        errors: []
      }
    };
    
    await emailNotifier.logActivity('test_operation', testResults, true, 1500);
    console.log('✅ Activity logged successfully');
    
    // Test rate limiting
    console.log('\n⏱️  Testing rate limiting...');
    const canSend = await emailNotifier.canSendEmail('info', 'test');
    console.log(`Can send email: ${canSend}`);
    
    // Test email sending (commented out to avoid spam)
    console.log('\n📧 Email sending test (disabled to avoid spam)');
    console.log('To test actual email sending, uncomment the lines below:');
    /*
    await emailNotifier.sendEmailWithRetry(
      'Database Email Test',
      'This is a test email from the database-based email notifier.',
      false,
      null,
      'test'
    );
    */
    
    console.log('\n🎉 Database email notifier test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your main scripts to use DatabaseEmailNotifier');
    console.log('2. Test with actual email sending (uncomment the lines above)');
    console.log('3. Verify emails are logged in the database');

  } catch (error) {
    console.error('❌ Database email notifier test failed:', error);
  }
}

// Run the test if called directly
if (require.main === module) {
  testDatabaseEmail();
}

module.exports = { testDatabaseEmail }; 