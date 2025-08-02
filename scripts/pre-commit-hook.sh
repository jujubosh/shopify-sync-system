#!/bin/bash

# Pre-commit hook to ensure inventory workflow is up-to-date
# This script should be run before committing changes

echo "🔍 Checking if inventory workflow needs updating..."

# Check if any retailer configs have changed
if git diff --cached --name-only | grep -q "config/retailers/"; then
    echo "📦 Retailer configs changed, updating inventory workflow..."
    
    # Generate updated workflow
    node scripts/generate-workflow-inputs.js
    
    # Check if workflow files changed
    if git diff --name-only | grep -q ".github/workflows/inventory-sync.yml\|RETAILER_OPTIONS.md"; then
        echo "✅ Workflow updated! Adding to commit..."
        git add .github/workflows/inventory-sync.yml RETAILER_OPTIONS.md
        echo "📝 Workflow changes added to commit"
    else
        echo "ℹ️  No workflow changes needed"
    fi
else
    echo "ℹ️  No retailer config changes detected"
fi

echo "✅ Pre-commit check completed" 