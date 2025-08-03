# Inventory Sync Email Logging

## Overview

The inventory sync process now has comprehensive email logging implemented with the following features:

- ✅ **Inventory-specific alerts** for successful updates, location mismatches, and failures
- ✅ **Error notifications** for critical failures during sync
- ✅ **Rate limiting** to prevent email spam
- ✅ **GitHub Actions integration** for automated workflows
- ✅ **Mobile-responsive email templates** with detailed statistics
- ✅ **Database logging** for audit trails

## Email Types

### 1. Inventory Alert Emails
- **Trigger**: After each inventory sync run
- **Content**: Summary of successful updates, location mismatches, and failures
- **Frequency**: Every sync run (with rate limiting)
- **Template**: `generateInventoryTemplate()` in `email-templates.js`

### 2. Error Notification Emails
- **Trigger**: When critical errors occur during inventory sync
- **Content**: Error details, stack trace, and context
- **Frequency**: Immediate (with exponential backoff for repeated errors)
- **Template**: `generateErrorTemplate()` in `email-templates.js`

## Data Structure

The inventory results structure that email logging expects:

```javascript
{
  inventory: {
    total: 150,                    // Total SKUs processed
    successfulUpdates: 120,        // Successfully updated SKUs
    locationMismatches: 20,       // SKUs with location mismatches
    failures: 10,                 // Failed updates
    details: {
      successfulUpdates: [
        { retailer: 'Retailer Name', sku: 'SKU001' }
      ],
      locationMismatches: [
        { 
          retailer: 'Retailer Name', 
          sku: 'SKU002',
          expectedLocation: 'Expected Location',
          actualLocation: 'Actual Location'
        }
      ],
      failures: [
        { 
          retailer: 'Retailer Name', 
          sku: 'SKU003',
          error: 'Error message'
        }
      ]
    }
  }
}
```

## Configuration

Email logging is controlled by the following settings in `config/global-config.json`:

```json
{
  "emailNotifications": {
    "enabled": true,
    "sendInventoryAlerts": true,
    "sendErrors": true,
    "minActivityThreshold": 0,
    "rateLimitMinutes": 120,
    "quietHours": {
      "start": 22,
      "end": 7
    },
    "githubActionsMode": true
  }
}
```

## Implementation Files

### Core Email Notifiers
- `scripts/utils/email-notifier.js` - Standard email notifier
- `scripts/utils/database-email-notifier.js` - Database-backed email notifier (used by inventory sync)

### Email Templates
- `scripts/utils/email-templates.js` - HTML email templates including `generateInventoryTemplate()`

### Inventory Sync Process
- `scripts/process-inventory.js` - Main inventory sync process with email integration
- `scripts/utils/inventory-processor.js` - Core inventory processing logic

## Email Template Features

### Inventory Alert Template
- 📊 **Summary Statistics**: Total SKUs, successful updates, location mismatches, failures
- 🏪 **Retailer Breakdown**: Per-retailer success rates and statistics
- ⚠️ **Location Mismatch Alerts**: Detailed information about location conflicts
- ❌ **Failure Details**: Specific error information for failed updates
- 📱 **Mobile Responsive**: Optimized for mobile devices
- 🎨 **Professional Styling**: Branded with Live Good Logistics colors

### Error Template
- 🔴 **Error Details**: Full error message and stack trace
- 📍 **Context Information**: Operation, retailer, and timestamp
- 🚨 **Critical Alert Styling**: Red-themed for immediate attention

## Rate Limiting & Smart Sending

### GitHub Actions Mode
- Sends emails immediately when there's activity
- Only rate limits error emails to prevent spam
- Includes GitHub Actions context in subject lines

### Local Mode
- Respects quiet hours (10 PM - 7 AM by default)
- Rate limits all email types
- Uses activity thresholds to prevent unnecessary emails

## Testing

Use the test script to verify email logging:

```bash
node test-inventory-email.js
```

This will:
1. Test inventory alert emails with mock data
2. Test error notification emails
3. Verify email template generation
4. Check rate limiting behavior

## Monitoring & Debugging

### Email Statistics
```javascript
const stats = emailNotifier.getEmailStats();
console.log('Email statistics:', stats);
```

### Activity Tracking
```javascript
// Check if there's significant activity
const hasActivity = emailNotifier.hasSignificantActivity(results);
console.log('Has significant activity:', hasActivity);
```

### Debug Mode
Enable debug information in emails:
```json
{
  "emailNotifications": {
    "includeDebugInfo": true
  }
}
```

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check Mailgun configuration and API keys
2. **Rate limiting**: Adjust `rateLimitMinutes` in config
3. **Template issues**: Verify inventory data structure matches expected format
4. **Database errors**: Check Supabase connection for database email notifier

### Debug Steps

1. Check email configuration:
   ```bash
   node -e "console.log(require('./config/global-config.json').emailNotifications)"
   ```

2. Test email sending:
   ```bash
   node test-inventory-email.js
   ```

3. Check logs for email-related messages:
   ```bash
   grep -r "📧" logs/
   ```

## Recent Fixes

### Fixed Issues
- ✅ **Data Structure Mismatch**: Updated email notifiers to handle correct inventory results structure
- ✅ **Template Compatibility**: Fixed inventory template to work with actual data format
- ✅ **Activity Detection**: Updated `hasSignificantActivity()` to use correct inventory fields
- ✅ **Summary Generation**: Fixed `summarizeResults()` to use proper inventory metrics

### Key Changes
1. Changed from `results.inventory.success?.length` to `results.inventory.successfulUpdates`
2. Changed from `results.inventory.errors?.length` to `results.inventory.failures`
3. Updated activity detection to use `results.inventory.total`
4. Fixed email templates to handle retailer-specific data correctly

## Future Enhancements

- [ ] Add inventory sync performance metrics
- [ ] Implement email digests for multiple retailers
- [ ] Add inventory-specific quiet hours
- [ ] Create inventory sync dashboard with email integration
- [ ] Add inventory sync scheduling with email notifications 