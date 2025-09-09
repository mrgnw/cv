#!/bin/bash

# Host PDF Commit Script - runs git operations on host machine
# This script should be run from the host, not from inside Docker

set -e

echo "🚀 Starting PDF generation and commit process on host..."

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $BRANCH"

# First, regenerate PDFs using Docker (only changed ones)
echo "📄 Generating PDFs with changes via Docker..."
if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "app.*Up"; then
        echo "🐳 Using existing Docker container..."
        docker-compose exec app node pdf-cli.js --changed
    else
        echo "🐳 Starting Docker container..."
        docker-compose up -d app
        sleep 5  # Give it a moment to start
        docker-compose exec app node pdf-cli.js --changed
    fi
else
    echo "⚠️  Docker Compose not found, trying direct Docker..."
    # Fallback for direct docker usage
    if docker ps | grep -q "cv.*Up"; then
        docker exec $(docker ps --filter "name=cv" --format "{{.ID}}") node pdf-cli.js --changed
    else
        echo "❌ No running Docker container found. Please start the development environment first."
        exit 1
    fi
fi

# Check if there are any changes in PDF files or cache file
PDF_CHANGES=$(git status --porcelain static/ .pdf-cache.json | grep -E '\.(pdf|json)$' || true)
if [[ -z "$PDF_CHANGES" ]]; then
    echo "ℹ️  No PDF or cache changes detected, nothing to commit"
    exit 0
fi

# Show what PDF files and cache changed
echo "📋 PDF and cache changes detected:"
echo "$PDF_CHANGES" | sed 's/^/  - /'

# Add PDF files and cache file
echo "➕ Adding PDF files and cache to git..."
git add static/*.pdf static/sans/*.pdf .pdf-cache.json 2>/dev/null || true

# Check if there's anything to commit after adding
if git diff --cached --quiet; then
    echo "ℹ️  No staged changes, nothing to commit"
    exit 0
fi

# Commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="Update PDFs and cache - $TIMESTAMP"
echo "💾 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# Push to current branch
echo "🚀 Pushing to $BRANCH..."
git push origin "$BRANCH"

echo "✅ PDF generation, commit, and push completed successfully!"
