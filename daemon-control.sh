#!/bin/bash

# PDF Daemon Management Script

DAEMON_NAME="com.morganwill.cv.pdf-watcher"
PLIST_FILE="/Users/m/dev/cv/$DAEMON_NAME.plist"
LAUNCHAGENTS_DIR="$HOME/Library/LaunchAgents"
DAEMON_PLIST="$LAUNCHAGENTS_DIR/$DAEMON_NAME.plist"

case "$1" in
    install)
        echo "🔧 Installing PDF daemon..."
        
        # Create LaunchAgents directory if it doesn't exist
        mkdir -p "$LAUNCHAGENTS_DIR"
        
        # Copy plist file to LaunchAgents
        cp "$PLIST_FILE" "$DAEMON_PLIST"
        
        # Load the daemon
        launchctl load "$DAEMON_PLIST"
        
        echo "✅ PDF daemon installed and started"
        echo "📁 Logs: /Users/m/dev/cv/logs/pdf-daemon.log"
        ;;
        
    uninstall)
        echo "🗑️  Uninstalling PDF daemon..."
        
        # Unload the daemon
        launchctl unload "$DAEMON_PLIST" 2>/dev/null || true
        
        # Remove plist file
        rm -f "$DAEMON_PLIST"
        
        echo "✅ PDF daemon uninstalled"
        ;;
        
    start)
        echo "🚀 Starting PDF daemon..."
        launchctl load "$DAEMON_PLIST"
        echo "✅ PDF daemon started"
        ;;
        
    stop)
        echo "⏹️  Stopping PDF daemon..."
        launchctl unload "$DAEMON_PLIST"
        echo "✅ PDF daemon stopped"
        ;;
        
    restart)
        echo "🔄 Restarting PDF daemon..."
        launchctl unload "$DAEMON_PLIST" 2>/dev/null || true
        launchctl load "$DAEMON_PLIST"
        echo "✅ PDF daemon restarted"
        ;;
        
    status)
        echo "📊 PDF daemon status:"
        if launchctl list | grep -q "$DAEMON_NAME"; then
            echo "✅ Running"
            echo "📄 Recent log entries:"
            tail -n 10 /Users/m/dev/cv/logs/pdf-daemon.log 2>/dev/null || echo "No log file found"
        else
            echo "❌ Not running"
        fi
        ;;
        
    logs)
        echo "📄 PDF daemon logs:"
        tail -f /Users/m/dev/cv/logs/pdf-daemon.log
        ;;
        
    *)
        echo "PDF Daemon Management"
        echo ""
        echo "Usage: $0 {install|uninstall|start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  install   - Install and start the daemon"
        echo "  uninstall - Stop and remove the daemon"
        echo "  start     - Start the daemon"
        echo "  stop      - Stop the daemon"  
        echo "  restart   - Restart the daemon"
        echo "  status    - Show daemon status and recent logs"
        echo "  logs      - Follow daemon logs in real-time"
        exit 1
        ;;
esac
