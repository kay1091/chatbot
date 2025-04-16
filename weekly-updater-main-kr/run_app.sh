#!/bin/bash

# Script to check prerequisites, install dependencies, and run the Opportunity Data Consolidator app.

# --- Configuration ---
APP_DIR="."
MIN_NODE_MAJOR_VERSION=14

# --- Helper Functions ---
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

check_node_version() {
  if ! command_exists node; then
    echo "Error: Node.js is not installed. Please install Node.js version $MIN_NODE_MAJOR_VERSION or higher from https://nodejs.org/"
    exit 1
  fi

  local node_version=$(node -v)
  local major_version=$(echo "$node_version" | sed 's/v\([0-9]*\).*/\1/')

  if [[ "$major_version" -lt "$MIN_NODE_MAJOR_VERSION" ]]; then
    echo "Error: Node.js version $MIN_NODE_MAJOR_VERSION or higher is required. You have version $node_version."
    echo "Please upgrade Node.js from https://nodejs.org/"
    exit 1
  fi
  echo "Node.js version check passed ($node_version)."
}

# --- Main Script ---

echo "Starting Opportunity Data Consolidator setup..."

# 1. Check Node.js
check_node_version

# 2. Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo "Error: Application directory '$APP_DIR' not found in the current location."
  echo "Please ensure you are running this script from the root project directory containing '$APP_DIR'."
  exit 1
fi

# 3. Navigate to app directory
cd "$APP_DIR" || { echo "Error: Could not navigate into '$APP_DIR'."; exit 1; }
echo "Changed directory to $(pwd)"

# 4. Install dependencies (if node_modules doesn't exist or package.json is newer)
# Simple check: just run npm install. npm is usually smart enough.
echo "Installing dependencies (this may take a few minutes)..."
if npm install; then
  echo "Dependencies installed successfully."
else
  echo "Error: Failed to install dependencies. Please check npm output for details."
  exit 1
fi

# 5. Run the application
echo "Starting the application..."
npm start

# Note: The script will stay running while the app is active. Press Ctrl+C in the terminal to stop.
echo "Application server started. Access it at http://localhost:3000 (usually opens automatically)."

# Keep script running until user stops the app (npm start blocks)
wait # This might not be strictly necessary as npm start blocks

echo "Application stopped."
exit 0