#!/bin/bash

# InterMap V2 Startup Script

echo "🚀 Starting InterMap V2..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
fi

# Run dev server
npm run dev
