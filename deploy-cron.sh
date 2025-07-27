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

# Create cron job
ssh $USERNAME@$SERVER_IP "crontab -l > /tmp/crontab.tmp"
ssh $USERNAME@$SERVER_IP "echo '*/15 * * * * cd /opt/shopify-sync && node scripts/process-all.js all >> /var/log/shopify-sync.log 2>&1' >> /tmp/crontab.tmp"
ssh $USERNAME@$SERVER_IP "crontab /tmp/crontab.tmp"
ssh $USERNAME@$SERVER_IP "rm /tmp/crontab.tmp"

echo "Deployment complete!"
echo "Cron job installed to run every 15 minutes"
echo "Logs will be written to /var/log/shopify-sync.log" 