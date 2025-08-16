#!/bin/bash

# Wrapper script to start the aeroponics app
# This script will be executed by systemd

# Set the project directory
PROJECT_DIR="/home/james/Documents/bills-garden/bills-garden"

# Change to the project directory
cd "$PROJECT_DIR" || {
    echo "ERROR: Cannot change to directory $PROJECT_DIR"
    exit 1
}

# Activate the virtual environment
source "$PROJECT_DIR/venv/bin/activate" || {
    echo "ERROR: Cannot activate virtual environment"
    exit 1
}

# Set environment variables
export PYTHONUNBUFFERED=1
export FLASK_ENV=production
export LOG_LEVEL=INFO

# Start the application
echo "Starting Bills Aeroponics app..."
exec "$PROJECT_DIR/venv/bin/python" "$PROJECT_DIR/app.py"

