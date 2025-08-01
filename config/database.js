require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Database schema constants
const TABLES = {
  RETAILERS: 'retailers',
  SYNC_JOBS: 'sync_jobs',
  EMAIL_NOTIFICATIONS: 'email_notifications',
  ACTIVITY_LOGS: 'activity_logs'
};

const JOB_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const OPERATION_TYPES = {
  ORDERS: 'orders',
  FULFILLMENTS: 'fulfillments',
  INVENTORY: 'inventory'
};

module.exports = {
  supabase,
  TABLES,
  JOB_STATUS,
  OPERATION_TYPES
}; 