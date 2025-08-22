#!/bin/bash

# Cybersecurity Dashboard Runner Script
# Runs the main.go aggregator with proper error handling and logging

set -e

echo "🛡️ Starting Cybersecurity Dashboard Aggregator..."
echo "======================================"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go first."
    exit 1
fi

# Check if main.go exists
if [ ! -f "main.go" ]; then
    echo "❌ main.go not found in current directory"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data
mkdir -p logs

# Set environment variables for better performance
export MAX_FEEDS=50  # Limit feeds for faster testing
export RATE_LIMIT_DELAY=2
export DEBUG_MODE=false

# Run the aggregator with timeout and logging
echo "🚀 Running RSS aggregator..."
echo "⚠️  This may take 2-5 minutes due to rate limiting..."

timeout 300s go run main.go 2>&1 | tee logs/aggregator-$(date +%Y%m%d-%H%M%S).log

if [ $? -eq 124 ]; then
    echo "⏰ Process timed out after 5 minutes"
    echo "🔄 Checking if data was generated..."
    
    if [ -f "data/posts.json" ] && [ -f "data/summary.json" ]; then
        echo "✅ Data files exist, aggregator ran successfully"
    else
        echo "❌ No data files found, aggregator may have failed"
        exit 1
    fi
else
    echo "✅ Aggregator completed successfully!"
fi

# Check if files were generated
echo ""
echo "📊 Checking generated files..."
ls -la data/ 2>/dev/null || echo "⚠️  No data directory found"
ls -la index.html 2>/dev/null && echo "✅ index.html exists" || echo "❌ index.html missing"

echo ""
echo "🌐 Dashboard ready!"
echo "📁 Open index.html in your browser to view the dashboard"
echo "🔄 Data will be refreshed when you run this script again"
echo "======================================"