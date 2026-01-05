#!/bin/bash

# Redis Health Check Script

echo "🔍 Checking Redis connection..."
echo ""

# Check if Redis is installed
if ! command -v redis-cli &> /dev/null; then
    echo "❌ Redis CLI not found. Redis may not be installed."
    echo ""
    echo "To install Redis:"
    echo "  Ubuntu/Debian: sudo apt-get install redis-server"
    echo "  macOS: brew install redis"
    echo "  Fedora: sudo dnf install redis"
    echo ""
    exit 1
fi

# Check if Redis server is running
if redis-cli ping &> /dev/null; then
    echo "✅ Redis is running and responding to PING"
    redis-cli INFO server | grep "redis_version"
    echo ""
    echo "Connection details:"
    echo "  Host: 127.0.0.1"
    echo "  Port: 6379"
else
    echo "❌ Redis is not responding"
    echo ""
    echo "To start Redis:"
    echo "  Ubuntu/Debian: sudo systemctl start redis-server"
    echo "  macOS: brew services start redis"
    echo "  Manual: redis-server"
    echo ""
    
    # Check if Redis process is running
    if pgrep -x "redis-server" > /dev/null; then
        echo "⚠️  Redis process is running but not responding on default port"
    else
        echo "⚠️  Redis process is not running"
    fi
fi
