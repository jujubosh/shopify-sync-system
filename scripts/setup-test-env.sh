#!/bin/bash

# Setup script for local testing environment variables
echo "🔧 Setting up test environment variables..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please create a .env file with your API tokens:"
    echo "   cp env-template.txt .env"
    echo "   # Then edit .env with your real API tokens"
    exit 1
fi

# Load environment variables from .env file
export $(cat .env | grep -v '^#' | xargs)

echo "✅ Environment variables loaded from .env:"
echo "   SHOPIFY_LGL_TOKEN: ${SHOPIFY_LGL_TOKEN:0:10}..."
echo "   SHOPIFY_NATIONWIDE_PLANTS_TOKEN: ${SHOPIFY_NATIONWIDE_PLANTS_TOKEN:0:10}..."
echo "   SHOPIFY_TEST_TOKEN: ${SHOPIFY_TEST_TOKEN:0:10}..."

echo ""
echo "🚀 You can now run: TEST_CONFIG=true node scripts/process-all.js"
echo "💡 Or source this script: source scripts/setup-test-env.sh" 