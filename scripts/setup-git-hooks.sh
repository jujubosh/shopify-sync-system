#!/bin/bash

# Setup script for Git hooks to automatically update inventory workflow

echo "🔧 Setting up Git hooks for automatic workflow updates..."

# Create .git/hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy the pre-commit hook
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed!"
echo ""
echo "📋 The pre-commit hook will now:"
echo "   - Check if retailer configs have changed"
echo "   - Automatically update inventory workflow if needed"
echo "   - Add workflow changes to your commit"
echo ""
echo "💡 To manually run the hook:"
echo "   ./scripts/pre-commit-hook.sh"
echo ""
echo "💡 To disable the hook temporarily:"
echo "   git commit --no-verify" 