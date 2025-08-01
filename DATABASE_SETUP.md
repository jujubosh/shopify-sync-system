# Database Setup Guide

This guide will help you set up the Supabase database for the Shopify sync system.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Node.js**: Ensure you have Node.js installed (version 14 or higher)
3. **Git**: Make sure you're on the `feature/email-notification-system` branch

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `shopify-sync-system`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
5. Click "Create new project"
6. Wait for the project to be created (usually 1-2 minutes)

## Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (starts with `eyJ`)

## Step 3: Configure Environment

Run the environment setup script:

```bash
npm run setup-env
```

This will prompt you for your Supabase credentials and create a `.env` file.

## Step 4: Test Database Connection

Test that your database connection works:

```bash
npm run test-db
```

This will verify:
- ✅ Database connection
- ✅ Table access permissions
- ✅ Basic CRUD operations

## Step 5: Set Up Database Schema

Create all necessary tables and indexes:

```bash
npm run setup-db
```

This creates:
- `retailers` table (stores retailer configurations)
- `sync_jobs` table (tracks sync operations)
- `email_notifications` table (stores email history)
- `activity_logs` table (tracks system activity)
- Appropriate indexes for performance

## Step 6: Migrate Existing Data

Migrate your existing retailer configurations and email state:

```bash
npm run migrate
```

This will:
- Import retailer configs from `config/retailers/` files
- Migrate email notification history from `logs/email-state.json`
- Preserve existing activity logs

## Step 7: Verify Setup

Check that everything is working:

```bash
npm run test-db
```

You should see all green checkmarks indicating success.

## Troubleshooting

### Connection Issues
- Verify your Supabase project is active
- Check that your IP is allowed in Supabase dashboard
- Ensure credentials are correct in `.env` file

### Permission Issues
- Make sure you're using the `anon` key, not the `service_role` key
- Check that your Supabase project has the necessary permissions

### Table Creation Issues
- Some tables might already exist (this is normal)
- Check Supabase dashboard > Table Editor to see created tables

## Database Schema

### Retailers Table
```sql
CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) NOT NULL UNIQUE,
  api_token VARCHAR(255) NOT NULL,
  target_location_id VARCHAR(255),
  settings JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sync Jobs Table
```sql
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID REFERENCES retailers(id),
  operation_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  results JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Email Notifications Table
```sql
CREATE TABLE email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT,
  html_body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent'
);
```

### Activity Logs Table
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID REFERENCES retailers(id),
  operation VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  details JSONB DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Next Steps

After completing the database setup:

1. **Update Email Configuration**: Modify the email settings in `.env` if needed
2. **Test Email System**: Run the email notification tests
3. **Deploy**: Push your changes and create a pull request
4. **Monitor**: Check the database for activity logs and sync jobs

## Useful Commands

```bash
# Quick setup (after getting Supabase credentials)
npm run setup-env
npm run test-db
npm run setup-db
npm run migrate

# Check database status
npm run test-db

# View logs
tail -f logs/*.log
``` 