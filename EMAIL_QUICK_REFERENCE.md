# Email Notification Quick Reference

## 🚀 New Features at a Glance

### Enhanced Reliability
- ✅ **Retry Logic**: Automatic retry with exponential backoff
- ✅ **Timeout Protection**: 30-second timeout prevents hanging
- ✅ **Better Error Handling**: Detailed error messages and status codes
- ✅ **Configuration Validation**: Automatic validation on startup

### Improved Rate Limiting
- ✅ **Exponential Backoff**: Error emails use smart backoff
- ✅ **Enhanced Tracking**: Better email frequency tracking
- ✅ **Flexible Limits**: Configurable per email type
- ✅ **Smart Filtering**: Activity-based filtering

### Activity Tracking & Analytics
- ✅ **Activity History**: Track all email activities
- ✅ **Success Rates**: Visual progress bars
- ✅ **Statistics**: Detailed email metrics
- ✅ **Debug Information**: Optional debug headers

### Enhanced Templates
- ✅ **Mobile Responsive**: Optimized for mobile
- ✅ **Progress Indicators**: Visual success rate bars
- ✅ **Better Styling**: Improved typography
- ✅ **Error Details**: Enhanced error reporting

## 📧 Email Types

| Type | Frequency | Color | Description |
|------|-----------|-------|-------------|
| **Fulfillment** | Every 5 min | 🔵 Blue | Fulfillment processing alerts |
| **Order** | Every 15 min | 🟢 Green | Order import alerts |
| **Inventory** | Every 30 min | 🟡 Yellow | Inventory sync alerts |
| **Summary** | Every 2 hours | 🎨 Multi | Comprehensive reports |
| **Error** | Immediate | 🔴 Red | Critical error notifications |

## ⚙️ Configuration Options

### Basic Settings
```json
{
  "enabled": true,
  "fromEmail": "admin@livegoodlogistics.com",
  "toEmail": "justin@livegoodlogistics.com",
  "sendErrors": true,
  "sendSummaries": true,
  "sendFulfillmentAlerts": true,
  "sendOrderAlerts": true,
  "sendInventoryAlerts": true
}
```

### Rate Limiting & Activity
```json
{
  "minActivityThreshold": 1,
  "rateLimitMinutes": 30,
  "quietHours": {
    "start": 22,
    "end": 7
  }
}
```

### Enhanced Reliability
```json
{
  "maxRetries": 3,
  "retryDelayMs": 5000,
  "exponentialBackoff": true
}
```

### Advanced Features
```json
{
  "includeDebugInfo": false,
  "subjectPrefix": "[Shopify Sync]",
  "activityTracking": true,
  "maxActivityHistory": 100
}
```

## 🔧 New Methods

### Get Email Statistics
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

### Test Email System
```bash
# Run comprehensive email tests
node scripts/test-email-notifications.js

# Test with debug mode
node scripts/test-email-notifications.js --debug

# Reset state before testing
node scripts/test-email-notifications.js --reset
```

## 📊 Progress Indicators

All email templates now include visual progress bars showing success rates:

- **Fulfillment Emails**: Blue progress bar showing fulfillment success rate
- **Order Emails**: Green progress bar showing order import success rate  
- **Inventory Emails**: Yellow progress bar showing inventory sync success rate
- **Summary Emails**: Multiple progress bars for each operation type

## 🎯 Success Rate Calculation

```
Success Rate = (Successful Operations / Total Operations) × 100
```

Example:
- 8 successful fulfillments + 2 errors = 10 total
- Success rate = (8/10) × 100 = 80%

## 📱 Mobile Optimization

All emails are now optimized for mobile devices:

- ✅ Responsive design for all screen sizes
- ✅ Touch-friendly buttons and links
- ✅ Optimized typography for mobile reading
- ✅ Proper image and content scaling
- ✅ Enhanced readability on small screens

## 🔍 Debug Mode

Enable debug information to troubleshoot email issues:

```json
{
  "emailNotifications": {
    "includeDebugInfo": true
  }
}
```

This adds debug headers with:
- Timestamp of email send
- Operation type
- Rate limiting information
- Email count for this type

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

## 🎨 Template Features

### Visual Elements
- **Progress Bars**: Show success rates visually
- **Color Coding**: Different colors for different operations
- **Status Badges**: Clear status indicators
- **Statistics Cards**: Highlight key metrics
- **Responsive Grids**: Adapt to screen size

### Enhanced Content
- **Detailed Error Reporting**: Include response data
- **Success Rate Calculations**: Automatic percentage display
- **Retailer Grouping**: Organize by retailer
- **Operation Type Labels**: Clear operation identification
- **Timestamp Display**: Formatted execution times

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

## 📞 Support

- **Documentation**: `EMAIL_NOTIFICATIONS.md`
- **Test Script**: `scripts/test-email-notifications.js`
- **Configuration**: `config/global-config.json`
- **State File**: `logs/email-state.json`

## 🎯 Best Practices

1. **Start Conservative**: Use higher rate limits initially
2. **Monitor Activity**: Check email statistics regularly
3. **Test Thoroughly**: Use test script before production
4. **Enable Debug**: Use debug mode for troubleshooting
5. **Track Patterns**: Monitor activity history for insights
6. **Mobile Test**: Verify emails look good on mobile
7. **Error Handling**: Monitor error notifications closely
8. **Performance**: Check email state file size periodically 