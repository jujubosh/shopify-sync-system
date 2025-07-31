#!/bin/bash

# Test script for order import with test configuration
# Usage: ./test-import.sh [retailer_id] [operation]
#
# Required environment variables for testing:
# - SHOPIFY_NATIONWIDE_PLANTS_TOKEN: API token for Nationwide Plants store
# - SHOPIFY_LGL_TOKEN: API token for LGL store  
# - MAILGUN_API_KEY: Mailgun API key for email notifications

RETAILER_ID=${1:-"nationwide-plants-config"}
OPERATION=${2:-"orders"}

echo "Testing import with test configuration..."
echo "Retailer: $RETAILER_ID"
echo "Operation: $OPERATION"
echo ""

# Check for required environment variables
if [ -z "$SHOPIFY_NATIONWIDE_PLANTS_TOKEN" ]; then
    echo "Warning: SHOPIFY_NATIONWIDE_PLANTS_TOKEN not set"
fi

if [ -z "$SHOPIFY_LGL_TOKEN" ]; then
    echo "Warning: SHOPIFY_LGL_TOKEN not set"
fi

if [ -z "$MAILGUN_API_KEY" ]; then
    echo "Warning: MAILGUN_API_KEY not set"
fi

echo ""

# Set test mode and run the import
TEST_CONFIG=true RETAILER_ID=$RETAILER_ID node scripts/process-all.js $OPERATION 