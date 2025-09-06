#!/bin/bash

# PDF Generation + Git Commit Script (Host Version)
set -e

echo "🚀 Starting PDF generation and commit process..."

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $BRANCH"

# Generate all PDFs using Docker
echo "📄 Generating all PDFs via Docker..."
docker-compose exec app node pdf-cli.js --force all

# Check if there are any changes
if git diff --quiet static/; then
    echo "ℹ️  No PDF changes detected, nothing to commit"
    exit 0
fi

# Show what changed
echo "📋 PDF changes detected:"
git diff --name-only static/ | sed 's/^/  - /'

# Add PDF files
echo "➕ Adding PDF files to git..."
git add static/*.pdf

# Commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="Update PDFs - $TIMESTAMP"
echo "💾 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# Push to current branch
echo "🚀 Pushing to $BRANCH..."
git push origin "$BRANCH"

echo "✅ PDF generation, commit, and push completed successfully!"
