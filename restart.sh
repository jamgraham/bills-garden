#!/bin/bash

# Restart script for Bills Aeroponics app
# This script handles restarting the Flask server more reliably

echo "🔄 Restarting Bills Aeroponics server..."

# Function to check if port is in use
check_port() {
    if lsof -i :5001 >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for port to be released
wait_for_port_release() {
    local max_wait=30
    local count=0
    
    echo "⏳ Waiting for port 5001 to be released..."
    while check_port && [ $count -lt $max_wait ]; do
        echo "   Port still in use, waiting... (${count}/${max_wait})"
        sleep 1
        count=$((count + 1))
    done
    
    if check_port; then
        echo "⚠️  Warning: Port 5001 still in use after ${max_wait} seconds"
        echo "🔧 Attempting to force kill processes on port 5001..."
        lsof -ti :5001 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        echo "✅ Port 5001 is now available"
    fi
}

# Find and kill any existing Python processes running app.py
echo "🛑 Stopping existing server processes..."
pkill -f "python.*app.py" || true

# Wait for port to be released
wait_for_port_release

# Pull latest changes (skip if not in git repo)
if [ -d ".git" ]; then
    echo "⬇️ Pulling latest changes..."
    git pull origin main
else
    echo "ℹ️  Not in git repository, skipping git pull"
fi

# Start the server again
echo "🚀 Starting server..."
python3 app.py &

# Wait a moment and check if it started successfully
sleep 3
if check_port; then
    echo "✅ Server restart complete! Running on port 5001"
else
    echo "❌ Server failed to start on port 5001"
    exit 1
fi