#!/usr/bin/env node

/**
 * Test script for enhanced email notifications
 * Demonstrates the new features and capabilities
 */

const fs = require('fs');
const path = require('path');

// Load test configuration
const configPath = path.join(__dirname, '../config/global-config-test.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Import the email notifier
const { EmailNotifier } = require('./utils/email-notifier');

async function testEmailNotifications() {
  console.log('🧪 Testing Enhanced Email Notification System\n');
  
  // Initialize email notifier
  const emailNotifier = new EmailNotifier(config);
  
  // Test 1: Configuration validation
  console.log('1. Configuration Validation:');
  console.log('   - Email notifications enabled:', emailNotifier.enabled);
  console.log('   - Error notifications enabled:', emailNotifier.sendErrors);
  console.log('   - Activity tracking enabled:', emailNotifier.activityTracking);
  console.log('   - Retry attempts:', emailNotifier.maxRetries);
  console.log('   - Exponential backoff:', emailNotifier.exponentialBackoff);
  console.log('   - Debug info enabled:', emailNotifier.includeDebugInfo);
  console.log('   - Mailgun API Key configured:', !!emailNotifier.apiKey);
  console.log('   - Mailgun Domain configured:', !!emailNotifier.domain);
  console.log('');
  
  // Test 2: Email statistics
  console.log('2. Email Statistics:');
  const stats = emailNotifier.getEmailStats();
  console.log('   - Total emails sent:', stats.totalEmails);
  console.log('   - Activity history entries:', stats.activityHistory);
  console.log('   - Currently in quiet hours:', stats.isInQuietHours);
  console.log('   - Email counts by type:', JSON.stringify(stats.emailCounts, null, 4));
  console.log('');
  
  // Test 3: Sample fulfillment data
  console.log('3. Testing Fulfillment Alert:');
  const fulfillmentData = {
    fulfillments: {
      success: [
        { retailer: 'Test Store 1', message: 'Fulfilled 5 orders successfully' },
        { retailer: 'Test Store 2', message: 'Fulfilled 3 orders successfully' }
      ],
      errors: [
        { retailer: 'Test Store 3', message: 'Failed to fulfill order #12345', response: { error: 'Invalid tracking number' } }
      ]
    }
  };
  
  console.log('   - Sending fulfillment alert with sample data...');
  try {
    await emailNotifier.sendFulfillmentAlert(fulfillmentData);
    console.log('   ✅ Fulfillment alert sent successfully');
  } catch (error) {
    console.log('   ❌ Fulfillment alert failed:', error.message);
  }
  console.log('');
  
  // Test 4: Sample order data
  console.log('4. Testing Order Alert:');
  const orderData = {
    orders: {
      success: [
        { retailer: 'Test Store 1', message: 'Imported 10 new orders' },
        { retailer: 'Test Store 2', message: 'Imported 7 new orders' }
      ],
      errors: [
        { retailer: 'Test Store 3', message: 'Failed to import order #67890', response: { error: 'Duplicate order' } }
      ]
    }
  };
  
  console.log('   - Sending order alert with sample data...');
  try {
    await emailNotifier.sendOrderAlert(orderData);
    console.log('   ✅ Order alert sent successfully');
  } catch (error) {
    console.log('   ❌ Order alert failed:', error.message);
  }
  console.log('');
  
  // Test 5: Sample inventory data
  console.log('5. Testing Inventory Alert:');
  const inventoryData = {
    inventory: {
      success: [
        { retailer: 'Test Store 1', message: 'Updated 25 SKU quantities' },
        { retailer: 'Test Store 2', message: 'Updated 18 SKU quantities' }
      ],
      errors: [
        { retailer: 'Test Store 3', message: 'Failed to update SKU ABC123', response: { error: 'SKU not found' } }
      ]
    }
  };
  
  console.log('   - Sending inventory alert with sample data...');
  try {
    await emailNotifier.sendInventoryAlert(inventoryData);
    console.log('   ✅ Inventory alert sent successfully');
  } catch (error) {
    console.log('   ❌ Inventory alert failed:', error.message);
  }
  console.log('');
  
  // Test 6: Sample summary data
  console.log('6. Testing Summary Alert:');
  const summaryData = {
    status: 'success',
    duration: 45000, // 45 seconds
    retailers: ['Test Store 1', 'Test Store 2', 'Test Store 3'],
    results: {
      fulfillments: {
        success: 2,
        errors: 1,
        total: 3
      },
      orders: {
        success: 2,
        errors: 1,
        total: 3
      },
      inventory: {
        success: 2,
        errors: 1,
        total: 3
      }
    }
  };
  
  console.log('   - Sending summary alert with sample data...');
  try {
    await emailNotifier.sendSummaryNotification(summaryData);
    console.log('   ✅ Summary alert sent successfully');
  } catch (error) {
    console.log('   ❌ Summary alert failed:', error.message);
  }
  console.log('');
  
  // Test 7: Error notification
  console.log('7. Testing Error Notification:');
  const testError = new Error('Test error for demonstration purposes');
  const errorContext = {
    retailer: 'Test Store',
    operation: 'order_import',
    additionalInfo: 'This is a test error notification'
  };
  
  console.log('   - Sending error notification with sample data...');
  try {
    await emailNotifier.sendErrorNotification(testError, errorContext);
    console.log('   ✅ Error notification sent successfully');
  } catch (error) {
    console.log('   ❌ Error notification failed:', error.message);
  }
  console.log('');
  
  // Test 8: Updated statistics
  console.log('8. Updated Email Statistics:');
  const updatedStats = emailNotifier.getEmailStats();
  console.log('   - Total emails sent:', updatedStats.totalEmails);
  console.log('   - Email counts by type:', JSON.stringify(updatedStats.emailCounts, null, 4));
  console.log('   - Last email times:', JSON.stringify(updatedStats.lastEmailTimes, null, 4));
  console.log('');
  
  // Test 9: Rate limiting demonstration
  console.log('9. Rate Limiting Test:');
  console.log('   - Attempting to send duplicate fulfillment alert...');
  try {
    await emailNotifier.sendFulfillmentAlert(fulfillmentData);
    console.log('   ✅ Duplicate email sent (rate limit not hit)');
  } catch (error) {
    console.log('   ❌ Duplicate email blocked by rate limiting');
  }
  console.log('');
  
  // Test 10: Activity tracking
  console.log('10. Activity Tracking:');
  console.log('   - Current activity history length:', emailNotifier.activityHistory.length);
  if (emailNotifier.activityHistory.length > 0) {
    const latestActivity = emailNotifier.activityHistory[emailNotifier.activityHistory.length - 1];
    console.log('   - Latest activity:', {
      operation: latestActivity.operation,
      timestamp: latestActivity.timestamp,
      success: latestActivity.success
    });
  }
  console.log('');
  
  console.log('🎉 Email notification testing completed!');
  console.log('');
  console.log('📧 Check your email for the test notifications.');
  console.log('📊 Review the email state file for detailed tracking: logs/email-state.json');
  console.log('🔧 Use emailNotifier.getEmailStats() to monitor email activity');
  console.log('🔄 Use emailNotifier.resetEmailState() to reset rate limiting if needed');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Email Notification Test Script

Usage:
  node test-email-notifications.js [options]

Options:
  --help, -h     Show this help message
  --reset        Reset email state before testing
  --debug        Enable debug mode for emails

Examples:
  node test-email-notifications.js
  node test-email-notifications.js --reset
  node test-email-notifications.js --debug
  `);
  process.exit(0);
}

// Run the test
testEmailNotifications().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 