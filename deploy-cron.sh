#!/bin/bash

# Deploy script for VPS/cron deployment
# Usage: ./deploy-cron.sh [server-ip] [username]

SERVER_IP=${1:-"your-server-ip"}
USERNAME=${2:-"root"}

echo "Deploying Shopify sync to $USERNAME@$SERVER_IP"

# Create remote directory
ssh $USERNAME@$SERVER_IP "mkdir -p /opt/shopify-sync"

# Copy files
scp -r scripts/ config/ package.json package-lock.json $USERNAME@$SERVER_IP:/opt/shopify-sync/

# Install dependencies
ssh $USERNAME@$SERVER_IP "cd /opt/shopify-sync && npm install"

# Create logs directory
ssh $USERNAME@$SERVER_IP "mkdir -p /opt/shopify-sync/logs"

# Backup existing crontab
ssh $USERNAME@$SERVER_IP "crontab -l > /tmp/crontab.backup 2>/dev/null || echo '' > /tmp/crontab.backup"

# Create new crontab entries
ssh $USERNAME@$SERVER_IP "cat > /tmp/crontab.new << 'EOF'
# Shopify Sync Cron Jobs

# Fulfillment processing - every 5 minutes (most frequent)
*/5 * * * * cd /opt/shopify-sync && node scripts/process-all.js fulfillments >> /var/log/shopify-sync-fulfillments.log 2>&1

# Order imports - every 15 minutes
*/15 * * * * cd /opt/shopify-sync && node scripts/process-all.js orders >> /var/log/shopify-sync-orders.log 2>&1

# Inventory sync - every 30 minutes
*/30 * * * * cd /opt/shopify-sync && node scripts/process-all.js inventory >> /var/log/shopify-sync-inventory.log 2>&1

# Full sync with summary - every 2 hours (reduced frequency)
0 */2 * * * cd /opt/shopify-sync && node scripts/process-all.js all >> /var/log/shopify-sync-all.log 2>&1

# Log rotation - daily at 2 AM
0 2 * * * find /var/log/shopify-sync*.log -mtime +7 -delete
EOF"

# Install new crontab
ssh $USERNAME@$SERVER_IP "crontab /tmp/crontab.new"

echo "Deployment complete!"
echo "Cron jobs installed:"
echo "  - Fulfillments: every 5 minutes"
echo "  - Orders: every 15 minutes"
echo "  - Inventory: every 30 minutes"
echo "  - Full sync: every 2 hours"
echo "Logs will be written to /var/log/shopify-sync-*.log" 