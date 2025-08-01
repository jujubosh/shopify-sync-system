# Email System Migration Guide

This guide helps you migrate from the file-based email system to the new database-based system.

## ✅ What's Been Completed

### **Database Setup**
- ✅ Supabase database configured and connected
- ✅ All tables created (retailers, sync_jobs, email_notifications, activity_logs)
- ✅ Existing data migrated from files to database
- ✅ Database-based email notifier created and tested

### **New Database Email Notifier**
- ✅ `DatabaseEmailNotifier` class created
- ✅ All email functionality preserved
- ✅ Rate limiting and quiet hours support
- ✅ Activity logging to database
- ✅ Email statistics from database
- ✅ GitHub Actions integration

## 🔄 Migration Steps

### Step 1: Update Your Main Scripts

Replace the old email notifier import with the new database version:

**Before:**
```javascript
const { EmailNotifier } = require('./utils/email-notifier');
```

**After:**
```javascript
const { DatabaseEmailNotifier } = require('./utils/database-email-notifier');
```

### Step 2: Update Email Notifier Instantiation

**Before:**
```javascript
const emailNotifier = new EmailNotifier(config);
```

**After:**
```javascript
const emailNotifier = new DatabaseEmailNotifier(config);
```

### Step 3: Update Method Calls (if needed)

The new `DatabaseEmailNotifier` has the same API as the old `EmailNotifier`, so most method calls will work without changes. However, some methods are now async:

**Before:**
```javascript
emailNotifier.trackActivity('orders', results);
```

**After:**
```javascript
await emailNotifier.logActivity('orders', results, true);
```

## 📊 Benefits of Database System

### **Persistent Storage**
- ✅ Email history stored in database
- ✅ Activity logs preserved across restarts
- ✅ Rate limiting based on database queries
- ✅ No more file corruption issues

### **Better Monitoring**
- ✅ Email statistics from database
- ✅ Activity tracking with timestamps
- ✅ Performance metrics (duration_ms)
- ✅ Success/failure tracking

### **Scalability**
- ✅ Multiple instances can share database
- ✅ No file locking issues
- ✅ Better concurrent access
- ✅ Centralized state management

## 🧪 Testing the Migration

### Test the Database Email System
```bash
npm run test-email
```

### Verify Data in Database
```bash
npm run verify-data
```

### Check Email Statistics
```bash
node -e "
const { DatabaseEmailNotifier } = require('./scripts/utils/database-email-notifier');
const config = require('./config/global-config.json');
const emailNotifier = new DatabaseEmailNotifier(config);
emailNotifier.getEmailStats().then(console.log);
"
```

## 📁 Files to Update

### **Main Scripts**
- `do-import-orders.js`
- `scripts/process-all.js`
- Any other scripts using `EmailNotifier`

### **Example Update**
```javascript
// Old import
const { EmailNotifier } = require('./scripts/utils/email-notifier');

// New import
const { DatabaseEmailNotifier } = require('./scripts/utils/database-email-notifier');

// Old instantiation
const emailNotifier = new EmailNotifier(config);

// New instantiation
const emailNotifier = new DatabaseEmailNotifier(config);

// Old method calls (most work the same)
await emailNotifier.sendErrorNotification(error, context);
await emailNotifier.sendOrderAlert(results);
await emailNotifier.sendFulfillmentAlert(results);
await emailNotifier.sendInventoryAlert(results);
await emailNotifier.sendSummaryNotification(summary);

// New async method calls
await emailNotifier.logActivity('orders', results, true, durationMs);
const stats = await emailNotifier.getEmailStats();
```

## 🔧 Configuration

The new system uses the same configuration as the old system:

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
    "minActivityThreshold": 0,
    "rateLimitMinutes": 120,
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
    "githubActionsMode": true,
    "enhancedTemplates": true
  }
}
```

## 🚀 Next Steps

1. **Update your main scripts** to use `DatabaseEmailNotifier`
2. **Test the migration** with a small batch
3. **Monitor the database** for email and activity logs
4. **Remove old file-based system** once confirmed working

## 📈 Monitoring

### Check Email Statistics
```javascript
const stats = await emailNotifier.getEmailStats();
console.log('24h Email Stats:', stats);
```

### Check Recent Activity
```javascript
// Query activity logs from database
const { data: activities } = await supabase
  .from('activity_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);
```

### Check Email History
```javascript
// Query email notifications from database
const { data: emails } = await supabase
  .from('email_notifications')
  .select('*')
  .order('sent_at', { ascending: false })
  .limit(10);
```

## 🆘 Troubleshooting

### Database Connection Issues
- Check your `.env` file has correct Supabase credentials
- Run `npm run test-db` to verify connection
- Check Supabase dashboard for table existence

### Email Not Sending
- Verify Mailgun credentials in config
- Check rate limiting settings
- Review activity logs in database

### Migration Issues
- Run `npm run verify-data` to check data integrity
- Check console logs for error messages
- Verify all tables exist in Supabase dashboard

## 📝 Migration Checklist

- [ ] Update imports to use `DatabaseEmailNotifier`
- [ ] Update instantiation to use new class
- [ ] Test email sending functionality
- [ ] Verify activity logging works
- [ ] Check email statistics
- [ ] Monitor database for new records
- [ ] Remove old file-based system (optional)
- [ ] Update documentation

The database-based email system is now ready for production use! 🎉 