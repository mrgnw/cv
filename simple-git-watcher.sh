#!/bin/bash

# Simple Git Trigger Watcher
# Just watches for .git-trigger and runs git operations

echo "👀 Watching for git triggers..."

while true; do
    if [ -f ".git-trigger" ]; then
        echo "🔔 Git trigger detected!"
        
        # Remove trigger file
        rm -f .git-trigger
        
        # Wait a moment for any file operations to complete
        sleep 2
        
        # Check for PDF changes
        if git status --porcelain static/ .pdf-cache.json | grep -E '\.(pdf|json)$' > /dev/null; then
            echo "📋 PDF changes detected, committing..."
            
            # Add PDFs and cache
            git add static/*.pdf static/sans/*.pdf .pdf-cache.json 2>/dev/null || true
            
            # Commit
            TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
            git commit -m "Update PDFs and cache - $TIMESTAMP"
            
            # Push
            BRANCH=$(git rev-parse --abbrev-ref HEAD)
            git push origin "$BRANCH"
            
            echo "✅ Git operations completed"
        else
            echo "ℹ️  No PDF changes to commit"
        fi
    fi
    
    sleep 2
done
