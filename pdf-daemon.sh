#!/bin/bash

# PDF Generation Daemon for macOS
# Watches for git triggers and automatically processes them using cv.skate-in.ts.net

set -e

REPO_DIR="/Users/m/dev/cv"
TRIGGER_FILE="$REPO_DIR/.git-trigger"
REMOTE_URL="https://cv.skate-in.ts.net"
LOG_DIR="$REPO_DIR/logs"
LOG_FILE="$LOG_DIR/pdf-daemon.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if remote server is available
check_remote_server() {
    if curl -s --max-time 5 "$REMOTE_URL" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to trigger PDF generation via remote server
trigger_remote_pdf_generation() {
    log "🌐 Triggering PDF generation via $REMOTE_URL"
    
    if ! check_remote_server; then
        log "❌ Remote server $REMOTE_URL is not accessible"
        return 1
    fi
    
    # Trigger PDF generation on the remote server
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"force": false}' \
        "$REMOTE_URL/dev/api/pdf" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        log "✅ Remote PDF generation triggered successfully"
        log "📄 Response: $response"
        return 0
    else
        log "❌ Failed to trigger remote PDF generation"
        return 1
    fi
}

# Function to process git trigger
process_git_trigger() {
    local trigger_content=""
    if [[ -f "$TRIGGER_FILE" ]]; then
        trigger_content=$(cat "$TRIGGER_FILE" 2>/dev/null || echo "{}")
        rm -f "$TRIGGER_FILE"
    fi
    
    log "🔔 Processing git trigger: $trigger_content"
    
    # Change to repo directory
    cd "$REPO_DIR"
    
    # Get current branch
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    log "📍 Current branch: $branch"
    
    # Trigger remote PDF generation
    if ! trigger_remote_pdf_generation; then
        log "❌ Remote PDF generation failed, skipping git operations"
        return 1
    fi
    
    # Wait a bit for PDFs to be generated
    log "⏳ Waiting for PDF generation to complete..."
    sleep 10
    
    # Check if there are any PDF changes to commit
    local pdf_changes=$(git status --porcelain static/ .pdf-cache.json 2>/dev/null | grep -E '\.(pdf|json)$' || true)
    
    if [[ -z "$pdf_changes" ]]; then
        log "ℹ️  No PDF or cache changes detected, nothing to commit"
        return 0
    fi
    
    # Show what changed
    log "📋 PDF and cache changes detected:"
    echo "$pdf_changes" | while read line; do
        log "  - $line"
    done
    
    # Add PDF files and cache
    log "➕ Adding PDF files and cache to git..."
    git add static/*.pdf static/sans/*.pdf .pdf-cache.json 2>/dev/null || true
    
    # Check if there's anything to commit after adding
    if git diff --cached --quiet 2>/dev/null; then
        log "ℹ️  No staged changes, nothing to commit"
        return 0
    fi
    
    # Commit with timestamp
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local commit_msg="Update PDFs and cache - $timestamp"
    log "💾 Committing: $commit_msg"
    
    if git commit -m "$commit_msg" 2>/dev/null; then
        log "✅ Commit successful"
        
        # Push to current branch
        log "🚀 Pushing to $branch..."
        if git push origin "$branch" 2>/dev/null; then
            log "✅ Push successful"
        else
            log "❌ Push failed"
            return 1
        fi
    else
        log "❌ Commit failed"
        return 1
    fi
    
    log "✅ Git workflow completed successfully"
}

# Main daemon loop
log "🚀 PDF Generation Daemon started"
log "📁 Watching: $TRIGGER_FILE"
log "🌐 Remote server: $REMOTE_URL"

while true; do
    if [[ -f "$TRIGGER_FILE" ]]; then
        log "🔔 Git trigger detected!"
        
        if process_git_trigger; then
            log "✅ Trigger processed successfully"
        else
            log "❌ Trigger processing failed"
        fi
        
        log "👀 Continuing to watch for triggers..."
    fi
    
    # Check every 3 seconds
    sleep 3
done
