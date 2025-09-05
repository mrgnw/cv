#!/bin/bash

# Start the dev server in the background
echo "🚀 Starting dev server..."
bun run dev --host &
DEV_PID=$!

# Wait a moment for the dev server to start
sleep 3

# Start PDF watcher
echo "👀 Starting PDF watcher..."
node pdf-cli.js --watch &
PDF_PID=$!

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down..."
    kill $DEV_PID $PDF_PID 2>/dev/null
    exit 0
}

# Trap signals to ensure cleanup
trap cleanup SIGTERM SIGINT

# Wait for either process to exit
wait $DEV_PID $PDF_PID
