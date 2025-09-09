#!/bin/bash

# Git Trigger Watcher - watches for Docker trigger files and executes git operations

TRIGGER_FILE=".git-trigger"

echo "👀 Watching for git triggers..."

while true; do
    if [ -f "$TRIGGER_FILE" ]; then
        echo "🔔 Git trigger detected!"
        
        # Read the trigger file to see what was requested
        if command -v jq >/dev/null 2>&1; then
            ACTION=$(jq -r '.action' "$TRIGGER_FILE" 2>/dev/null || echo "unknown")
            TIMESTAMP=$(jq -r '.timestamp' "$TRIGGER_FILE" 2>/dev/null || echo "unknown")
            echo "📋 Action: $ACTION at $TIMESTAMP"
        fi
        
        # Remove the trigger file first
        rm "$TRIGGER_FILE"
        
        # Execute the PDF commit workflow
        echo "🚀 Executing host PDF commit workflow..."
        ./host-pdf-commit.sh
        
        echo "✅ Trigger processed. Continuing to watch..."
    fi
    
    sleep 2
done
