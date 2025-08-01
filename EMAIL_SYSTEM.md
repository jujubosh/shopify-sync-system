# Email Notification System

## Overview

The Shopify sync system includes a comprehensive email notification system that provides detailed alerts for all operations with enhanced reliability, rate limiting, and mobile-optimized templates.

## 🚀 Features

### Enhanced Reliability
- **Retry Logic**: Automatic retry with exponential backoff for failed email sends
- **Timeout Protection**: 30-second timeout prevents hanging requests
- **Better Error Handling**: Detailed error messages and status codes
- **Configuration Validation**: Automatic validation of email settings on startup

### Improved Rate Limiting
- **Exponential Backoff**: Error emails use exponential backoff to prevent spam
- **Enhanced Tracking**: Better tracking of email frequency and counts
- **Flexible Limits**: Configurable rate limits per email type
- **Smart Filtering**: Intelligent filtering based on activity levels

### Activity Tracking & Analytics
- **Activity History**: Track all email activities for analysis
- **Success Rates**: Visual progress bars showing success rates
- **Statistics**: Detailed email statistics and metrics
- **Debug Information**: Optional debug headers for troubleshooting

### Enhanced Email Templates
- **Mobile Responsive**: Optimized for mobile devices
- **Progress Indicators**: Visual progress bars for success rates
- **Better Styling**: Improved typography and layout with green titles
- **Error Details**: Enhanced error reporting with context

## 📧 Email Types

| Type | Frequency | Color | Description |
|------|-----------|-------|-------------|
| **Fulfillment** | Every 5 min | 🔵 Blue | Fulfillment processing alerts |
| **Order** | Every 15 min | 🟢 Green | Order import alerts |
| **Inventory** | Every 30 min | 🟡 Yellow | Inventory sync alerts |
| **Summary** | Every 2 hours | 🎨 Multi | Comprehensive reports |
| **Error** | Immediate | 🔴 Red | Critical error notifications |

## ⚙️ Configuration

### Global Config Settings

```json
{
  "emailNotifications": {
    "enabled": true,
    "fromEmail": "admin@livegoodlogistics.com",
    "toEmail": "justin@livegoodlogistics.com",
    "sendErrors": true,
    "sendSummaries": true,
    "sendFulfillmentAlerts": true,
    "sendOrderAlerts": true,
    "sendInventoryAlerts": true,
    "minActivityThreshold": 1,
    "rateLimitMinutes": 30,
    "quietHours": {
      "start": 22,
      "end": 7
    },
    "maxRetries": 3,
    "retryDelayMs": 5000,
    "exponentialBackoff": true,
    "includeDebugInfo": false,
    "subjectPrefix": "",
    "activityTracking": true,
    "maxActivityHistory": 100
  }
}
```

### Settings Explained

#### Basic Settings
- **enabled**: Master switch for all email notifications
- **fromEmail**: Sender email address
- **toEmail**: Recipient email address
- **sendErrors**: Send error notifications (always on during quiet hours)
- **sendSummaries**: Send comprehensive summary emails
- **sendFulfillmentAlerts**: Send fulfillment-specific alerts
- **sendOrderAlerts**: Send order-specific alerts
- **sendInventoryAlerts**: Send inventory-specific alerts

#### Rate Limiting & Activity
- **minActivityThreshold**: Minimum activities required to send email (default: 1)
- **rateLimitMinutes**: Minutes between similar emails (default: 30)
- **quietHours**: Hours when non-critical emails are suppressed

#### Enhanced Reliability
- **maxRetries**: Maximum number of retry attempts for failed emails (default: 3)
- **retryDelayMs**: Initial delay between retries in milliseconds (default: 5000)
- **exponentialBackoff**: Use exponential backoff for retries (default: true)

#### Advanced Features
- **includeDebugInfo**: Include debug information in email headers (default: false)
- **subjectPrefix**: Custom prefix for email subjects (default: "")
- **activityTracking**: Track email activity history (default: true)
- **maxActivityHistory**: Maximum number of activities to track (default: 100)

## 🎨 Visual Design

### Color Scheme
- **Header Titles**: Green (`#198754`) - Professional and consistent branding
- **Fulfillment**: Blue gradient for fulfillment operations
- **Orders**: Green gradient for order operations  
- **Inventory**: Yellow gradient for inventory operations
- **Errors**: Red gradient for error notifications
- **Success Items**: Light green background with green borders
- **Error Items**: Light red background with red borders
- **Warning Items**: Light yellow background with yellow borders

### Mobile Optimization
- **Responsive Design**: Optimized for all screen sizes
- **Touch-Friendly**: Adequate button sizes for mobile interaction
- **Readable Text**: Optimized font sizes for mobile screens
- **No Horizontal Scrolling**: All content fits within viewport

### Progress Indicators
All email templates include visual progress bars showing success rates:
- **Fulfillment Emails**: Blue progress bar showing fulfillment success rate
- **Order Emails**: Green progress bar showing order import success rate  
- **Inventory Emails**: Yellow progress bar showing inventory sync success rate
- **Summary Emails**: Multiple progress bars for each operation type

## 📊 Success Rate Calculation

```
Success Rate = (Successful Operations / Total Operations) × 100
```

Example:
- 8 successful fulfillments + 2 errors = 10 total
- Success rate = (8/10) × 100 = 80%

## 🔧 Testing

### Test Email System
```bash
# Run comprehensive email tests (auto-resets state)
node scripts/test-email-notifications.js

# Test with debug mode
node scripts/test-email-notifications.js --debug

# Manual reset if needed
node scripts/test-email-notifications.js --reset
```

### Email Statistics
```javascript
const stats = emailNotifier.getEmailStats();
console.log('Total emails:', stats.totalEmails);
console.log('Email counts:', stats.emailCounts);
console.log('Last email times:', stats.lastEmailTimes);
```

### Reset Email State
```javascript
// Reset rate limiting and activity history
emailNotifier.resetEmailState();
```

## 📈 Monitoring

### Email Statistics
```javascript
const stats = emailNotifier.getEmailStats();
```

Returns:
- `totalEmails`: Total emails sent
- `emailCounts`: Count by email type
- `lastEmailTimes`: When each type was last sent
- `activityHistory`: Number of tracked activities
- `isInQuietHours`: Current quiet hours status

### Activity History
Track recent email activities for analysis:
- Operation type
- Timestamp
- Results summary
- Success status

## 🚨 Troubleshooting

### Email Not Being Sent
1. Check `enabled` setting
2. Verify specific alert type is enabled
3. Check activity threshold
4. Verify rate limiting
5. Check quiet hours
6. Validate Mailgun credentials
7. Check email state file

### Too Many Emails
1. Increase `rateLimitMinutes`
2. Increase `minActivityThreshold`
3. Adjust `quietHours`
4. Disable specific alert types
5. Enable exponential backoff

### Rate Limiting Issues
```bash
# Reset email state
rm logs/email-state.json

# Or use the method
emailNotifier.resetEmailState();
```

## 📞 Support

- **Test Script**: `scripts/test-email-notifications.js`
- **Configuration**: `config/global-config.json`
- **State File**: `logs/email-state.json`
- **Templates**: `scripts/utils/email-templates.js`

## 🎯 Best Practices

1. **Start Conservative**: Use higher rate limits initially
2. **Monitor Activity**: Check email statistics regularly
3. **Test Thoroughly**: Use test script before production
4. **Enable Debug**: Use debug mode for troubleshooting
5. **Track Patterns**: Monitor activity history for insights
6. **Mobile Test**: Verify emails look good on mobile
7. **Error Handling**: Monitor error notifications closely
8. **Performance**: Check email state file size periodically

## 🔄 Migration Guide

### From Old System
1. ✅ **Backward Compatible**: Existing configs work
2. ✅ **Enhanced Features**: New features are optional
3. ✅ **Gradual Adoption**: Enable features as needed

### Recommended Steps
1. Update configuration with new settings
2. Test with `test-email-notifications.js`
3. Enable activity tracking
4. Configure retry settings
5. Adjust rate limiting as needed
6. Enable debug mode for troubleshooting

---

**Status**: ✅ **COMPLETE** - All email system improvements implemented and tested successfully. 