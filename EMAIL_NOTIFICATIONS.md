# Enhanced Email Notification System

## Overview

The Shopify sync system now includes a significantly enhanced email notification system that provides better control over when and what types of notifications are sent. This helps reduce email spam while ensuring important alerts are still delivered, with improved reliability and user experience.

## 🚀 New Features

### 1. Enhanced Reliability
- **Retry Logic**: Automatic retry with exponential backoff for failed email sends
- **Timeout Protection**: 30-second timeout to prevent hanging requests
- **Better Error Handling**: Detailed error messages and status codes
- **Configuration Validation**: Automatic validation of email settings on startup

### 2. Improved Rate Limiting
- **Exponential Backoff**: Error emails use exponential backoff to prevent spam
- **Enhanced Tracking**: Better tracking of email frequency and counts
- **Flexible Limits**: Configurable rate limits per email type
- **Smart Filtering**: Intelligent filtering based on activity levels

### 3. Activity Tracking & Analytics
- **Activity History**: Track all email activities for analysis
- **Success Rates**: Visual progress bars showing success rates
- **Statistics**: Detailed email statistics and metrics
- **Debug Information**: Optional debug headers for troubleshooting

### 4. Enhanced Email Templates
- **Mobile Responsive**: Optimized for mobile devices
- **Progress Indicators**: Visual progress bars for success rates
- **Better Styling**: Improved typography and layout
- **Error Details**: Enhanced error reporting with context

### 5. Advanced Configuration
- **Custom Subject Prefixes**: Configurable email subject prefixes
- **Debug Mode**: Optional debug information in emails
- **Activity Tracking**: Configurable activity history tracking
- **Enhanced Settings**: More granular control over email behavior

## Features

### 1. Separate Email Types

- **Fulfillment Alerts**: Sent when fulfillments are processed (every 5 minutes)
- **Order Alerts**: Sent when orders are imported (every 15 minutes)
- **Inventory Alerts**: Sent when inventory is synced (every 30 minutes)
- **Summary Emails**: Comprehensive report sent during full sync (every 2 hours)
- **Error Notifications**: Sent immediately when errors occur

### 2. Activity-Based Filtering

- Emails are only sent when there's actual activity (configurable threshold)
- No more empty "everything is working" emails
- Minimum activity threshold can be configured
- Visual progress indicators show success rates

### 3. Enhanced Rate Limiting

- Prevents email spam by limiting frequency of similar emails
- Configurable rate limit (default: 30 minutes between similar emails)
- Separate rate limits for different operation types
- Exponential backoff for error emails to prevent spam

### 4. Quiet Hours

- Suppresses non-critical emails during quiet hours (default: 10 PM - 7 AM)
- Error notifications still sent during quiet hours
- Configurable quiet hours
- Clear logging when emails are skipped

### 5. Enhanced HTML Templates

- Beautiful, responsive email templates
- Color-coded by operation type:
  - 🔵 Fulfillments (blue)
  - 🟢 Orders (green)
  - 🟡 Inventory (yellow)
  - 🔴 Errors (red)
- Includes statistics and detailed breakdowns
- Progress bars showing success rates
- Mobile-optimized design

## Configuration

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
    "subjectPrefix": "[Shopify Sync]",
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
- **subjectPrefix**: Custom prefix for email subjects (default: "[Shopify Sync]")
- **activityTracking**: Track email activity history (default: true)
- **maxActivityHistory**: Maximum number of activities to track (default: 100)

## Cron Schedule

The system now uses separate cron jobs for different operations:

```bash
# Fulfillment processing - every 5 minutes
*/5 * * * * cd /opt/shopify-sync && node scripts/process-all.js fulfillments

# Order imports - every 15 minutes  
*/15 * * * * cd /opt/shopify-sync && node scripts/process-all.js orders

# Inventory sync - every 30 minutes
*/30 * * * * cd /opt/shopify-sync && node scripts/process-all.js inventory

# Full sync with summary - every 2 hours
0 */2 * * * cd /opt/shopify-sync && node scripts/process-all.js all
```

## Email State Tracking

The system maintains an enhanced state file (`logs/email-state.json`) to track:

- **Last Email Times**: When each type of email was last sent
- **Email Counts**: How many times each type has been sent
- **Activity History**: Recent activity for analysis
- **Rate Limiting**: Smart rate limiting with exponential backoff

This file is automatically created and managed.

## New Methods

### Email Statistics
```javascript
const stats = emailNotifier.getEmailStats();
console.log('Total emails sent:', stats.totalEmails);
console.log('Email counts by type:', stats.emailCounts);
console.log('Last email times:', stats.lastEmailTimes);
```

### Reset Email State
```javascript
// Useful for troubleshooting rate limiting issues
emailNotifier.resetEmailState();
```

## Benefits

1. **Improved Reliability**: Retry logic and better error handling
2. **Reduced Email Volume**: Only sends emails when there's actual activity
3. **Better Organization**: Separate emails for different operations
4. **Enhanced Tracking**: Visual progress indicators and success rates
5. **Flexible Scheduling**: Different frequencies for different operations
6. **Professional Appearance**: Beautiful HTML templates with branding
7. **Smart Filtering**: Quiet hours and enhanced rate limiting
8. **Mobile Optimized**: Responsive design for mobile devices
9. **Debug Capabilities**: Optional debug information for troubleshooting
10. **Activity Analytics**: Track and analyze email patterns

## Troubleshooting

### Email Not Being Sent

1. Check if email notifications are enabled in config
2. Verify the specific alert type is enabled
3. Check if activity threshold is met
4. Verify rate limiting isn't blocking the email
5. Check if currently in quiet hours (for non-error emails)
6. Validate Mailgun credentials are configured
7. Check email state file for rate limiting issues

### Too Many Emails

1. Increase `rateLimitMinutes` in config
2. Increase `minActivityThreshold` 
3. Adjust `quietHours` to suppress more emails
4. Disable specific alert types you don't need
5. Enable exponential backoff for error emails

### Email State Issues

If rate limiting seems stuck, you can reset the email state:

```bash
rm /opt/shopify-sync/logs/email-state.json
```

Or use the new reset method:

```javascript
emailNotifier.resetEmailState();
```

The system will recreate the file on next run.

### Debug Mode

Enable debug information to troubleshoot email issues:

```json
{
  "emailNotifications": {
    "includeDebugInfo": true
  }
}
```

This will add debug headers to emails with rate limiting and timing information.

## Migration from Old System

The new system is backward compatible. Existing configurations will work, but you may want to:

1. Enable the new alert types you want
2. Adjust the rate limiting settings
3. Set appropriate quiet hours
4. Update the cron schedule using the new deployment script
5. Consider enabling activity tracking for better analytics
6. Configure retry settings for better reliability

## Performance Monitoring

The system now provides better monitoring capabilities:

- **Email Statistics**: Track total emails sent and success rates
- **Activity History**: Monitor patterns in email activity
- **Rate Limiting**: Visual indicators of rate limiting status
- **Success Rates**: Progress bars showing operation success rates

## Mobile Optimization

All email templates are now optimized for mobile devices:

- Responsive design that works on all screen sizes
- Touch-friendly buttons and links
- Optimized typography for mobile reading
- Proper scaling of images and content
- Enhanced readability on small screens 