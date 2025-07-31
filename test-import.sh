#!/bin/bash

# Test script for order import with test configuration
# Usage: ./test-import.sh [retailer_id] [operation]

RETAILER_ID=${1:-"nationwide-plants-config"}
OPERATION=${2:-"orders"}

echo "Testing import with test configuration..."
echo "Retailer: $RETAILER_ID"
echo "Operation: $OPERATION"
echo ""

# Set test mode and run the import
TEST_CONFIG=true RETAILER_ID=$RETAILER_ID node scripts/process-all.js $OPERATION 