#!/bin/bash

echo "=== Blog Services Status Check ==="
echo ""

# Check gunicorn on port 8001
echo "1. Checking Gunicorn (port 8001)..."
if ps aux | grep -v grep | grep -q "gunicorn.*8001"; then
    echo "✅ Gunicorn is running"
    ps aux | grep -v grep | grep "gunicorn.*8001" | head -1
else
    echo "❌ Gunicorn is NOT running"
fi

echo ""

# Check nginx on port 8000
echo "2. Checking Nginx (port 8000)..."
if ps aux | grep -v grep | grep -q "nginx.*master"; then
    echo "✅ Nginx is running"
    ps aux | grep -v grep | grep "nginx.*master" | head -1
else
    echo "❌ Nginx is NOT running"
fi

echo ""

# Check cloudflared tunnel
echo "3. Checking Cloudflared tunnel..."
if ps aux | grep -v grep | grep -q "cloudflared.*tunnel"; then
    echo "✅ Cloudflared tunnel is running"
    ps aux | grep -v grep | grep "cloudflared.*tunnel" | head -1
else
    echo "❌ Cloudflared tunnel is NOT running"
fi

echo ""

# Check port status
echo "4. Port status check..."
echo "Port 8000 (nginx):"
lsof -i :8000 2>/dev/null || echo "   No process listening on port 8000"
echo ""
echo "Port 8001 (gunicorn):"
lsof -i :8001 2>/dev/null || echo "   No process listening on port 8001"

echo ""

# Check latest logs
echo "5. Latest error logs:"
if [ -f logs/error.log ]; then
    tail -5 logs/error.log
else
    echo "   Error log file not found"
fi

echo ""
echo "=== End of Status Check ==="