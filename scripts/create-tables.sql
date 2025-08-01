-- Database Schema Creation Script for Shopify Sync System
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create retailers table
CREATE TABLE IF NOT EXISTS retailers (
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

-- Create sync_jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  results JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_notifications table
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT,
  html_body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent'
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  operation VARCHAR(50) NOT NULL,
  success BOOLEAN NOT NULL,
  details JSONB DEFAULT '{}',
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_retailer_status ON sync_jobs(retailer_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_retailer_created ON activity_logs(retailer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON email_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_retailers_domain ON retailers(domain);
CREATE INDEX IF NOT EXISTS idx_retailers_enabled ON retailers(enabled);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can restrict these later)
CREATE POLICY "Allow all operations on retailers" ON retailers FOR ALL USING (true);
CREATE POLICY "Allow all operations on sync_jobs" ON sync_jobs FOR ALL USING (true);
CREATE POLICY "Allow all operations on email_notifications" ON email_notifications FOR ALL USING (true);
CREATE POLICY "Allow all operations on activity_logs" ON activity_logs FOR ALL USING (true);

-- Insert some sample data for testing (optional)
INSERT INTO retailers (name, domain, api_token, settings) VALUES 
('Test Store', 'test-store.myshopify.com', 'test_token_123', '{"enabled": true, "importOrders": true}')
ON CONFLICT (domain) DO NOTHING; 