#!/bin/bash

# Restart script for Bills Aeroponics app
# This script handles restarting the Flask server more reliably

echo "🔄 Restarting Bills Aeroponics server..."

# Find and kill any existing Python processes running app.py
pkill -f "python.*app.py" || true

# Wait a moment for the port to be released
sleep 3

# Pull latest changes
echo "⬇️ Pulling latest changes..."
git pull origin main

# Start the server again
echo "🚀 Starting server..."
python3 app.py &

echo "✅ Server restart complete!"