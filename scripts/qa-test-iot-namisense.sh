#!/bin/bash

# QA Test Script for iot.namisense.com
# Tests container and Nginx configuration

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"

echo "========================================="
echo "QA TEST: iot.namisense.com"
echo "========================================="
echo ""

# Test 1: Docker Containers
echo "TEST 1: Docker Containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd "$PROJECT_DIR" 2>/dev/null || {
    echo "❌ FAIL: Project directory not found: $PROJECT_DIR"
    exit 1
}

FRONTEND_RUNNING=$(docker ps --format '{{.Names}}' | grep -c "^iot_web3_frontend$" || echo "0")
BACKEND_RUNNING=$(docker ps --format '{{.Names}}' | grep -c "^iot_web3_backend$" || echo "0")
POSTGRES_RUNNING=$(docker ps --format '{{.Names}}' | grep -c "^iot_web3_postgres$" || echo "0")
MQTT_RUNNING=$(docker ps --format '{{.Names}}' | grep -c "^iot_web3_mqtt$" || echo "0")

if [ "$FRONTEND_RUNNING" -eq 1 ]; then
    echo "✅ PASS: Frontend container running"
else
    echo "❌ FAIL: Frontend container NOT running"
fi

if [ "$BACKEND_RUNNING" -eq 1 ]; then
    echo "✅ PASS: Backend container running"
else
    echo "❌ FAIL: Backend container NOT running"
fi

if [ "$POSTGRES_RUNNING" -eq 1 ]; then
    echo "✅ PASS: PostgreSQL container running"
else
    echo "❌ FAIL: PostgreSQL container NOT running"
fi

if [ "$MQTT_RUNNING" -eq 1 ]; then
    echo "✅ PASS: MQTT container running"
else
    echo "❌ FAIL: MQTT container NOT running"
fi

echo ""
echo "Container status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep iot_web3 || echo "  (no containers found)"
echo ""

# Test 2: Port Accessibility
echo "TEST 2: Port Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "✅ PASS: Frontend (port 3000) accessible"
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000)
    echo "   HTTP Status: $FRONTEND_STATUS"
else
    echo "❌ FAIL: Frontend (port 3000) NOT accessible"
    echo "   Container logs (last 10 lines):"
    docker logs iot_web3_frontend --tail 10 2>&1 | sed 's/^/   /'
fi

if curl -sf http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo "✅ PASS: Backend (port 3001) accessible"
    BACKEND_HEALTH=$(curl -s http://127.0.0.1:3001/health)
    echo "   Health response: $BACKEND_HEALTH"
else
    echo "❌ FAIL: Backend (port 3001) NOT accessible"
    echo "   Container logs (last 10 lines):"
    docker logs iot_web3_backend --tail 10 2>&1 | sed 's/^/   /'
fi

echo ""

# Test 3: Nginx Configuration
echo "TEST 3: Nginx Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v nginx > /dev/null 2>&1; then
    echo "❌ FAIL: Nginx not installed"
else
    echo "✅ PASS: Nginx installed"
    
    # Check if config exists
    if [ -f "/etc/nginx/sites-available/iot.namisense.com" ]; then
        echo "✅ PASS: Config file exists"
    else
        echo "❌ FAIL: Config file NOT found: /etc/nginx/sites-available/iot.namisense.com"
    fi
    
    # Check if config is enabled
    if [ -L "/etc/nginx/sites-enabled/iot.namisense.com" ]; then
        echo "✅ PASS: Config is enabled"
    else
        echo "❌ FAIL: Config NOT enabled"
        echo "   Enabled configs:"
        ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/   /' || echo "   (none)"
    fi
    
    # Check Nginx syntax
    if nginx -t > /dev/null 2>&1; then
        echo "✅ PASS: Nginx configuration syntax is valid"
    else
        echo "❌ FAIL: Nginx configuration syntax error"
        nginx -t 2>&1 | sed 's/^/   /'
    fi
    
    # Check if Nginx is running
    if systemctl is-active --quiet nginx; then
        echo "✅ PASS: Nginx service is running"
    else
        echo "❌ FAIL: Nginx service NOT running"
    fi
    
    # Show the actual server block for iot.namisense.com
    echo ""
    echo "Server block for iot.namisense.com:"
    nginx -T 2>&1 | grep -A 30 "server_name.*iot.namisense.com" | head -35 | sed 's/^/   /' || echo "   (not found)"
fi

echo ""

# Test 4: Routing Test
echo "TEST 4: Routing Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test with Host header
echo "Testing with Host header (iot.namisense.com):"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: iot.namisense.com" http://127.0.0.1/health 2>&1)
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "301" ] || [ "$RESPONSE" = "302" ]; then
    echo "✅ PASS: Routing works (HTTP $RESPONSE)"
else
    echo "❌ FAIL: Routing failed (HTTP $RESPONSE)"
    echo "   Full response:"
    curl -v -H "Host: iot.namisense.com" http://127.0.0.1/health 2>&1 | grep -i "HTTP\|server\|location" | head -5 | sed 's/^/   /'
fi

# Test direct domain (if DNS is configured)
echo ""
echo "Testing direct domain (iot.namisense.com):"
if curl -sf -m 5 http://iot.namisense.com > /dev/null 2>&1; then
    DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -m 5 http://iot.namisense.com 2>&1)
    echo "✅ PASS: Domain accessible (HTTP $DOMAIN_STATUS)"
else
    echo "⚠️  WARN: Domain not accessible (might be DNS issue)"
    echo "   Testing with curl:"
    curl -I -m 5 http://iot.namisense.com 2>&1 | head -5 | sed 's/^/   /' || echo "   (connection failed)"
fi

echo ""

# Test 5: Check for conflicts
echo "TEST 5: Check for Conflicts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for default_server
DEFAULT_SERVERS=$(nginx -T 2>&1 | grep -c "default_server" || echo "0")
if [ "$DEFAULT_SERVERS" -gt 0 ]; then
    echo "⚠️  WARN: Found $DEFAULT_SERVERS default_server directive(s)"
    echo "   These might catch requests:"
    nginx -T 2>&1 | grep -B 3 "default_server" | grep "server_name\|listen" | sed 's/^/   /'
else
    echo "✅ PASS: No default_server directives found"
fi

# Check for IP in server_name
IP_IN_SERVERNAME=$(nginx -T 2>&1 | grep -c "server_name.*152.42.239.238" || echo "0")
if [ "$IP_IN_SERVERNAME" -gt 0 ]; then
    echo "⚠️  WARN: Found IP address in server_name"
    echo "   These might catch requests:"
    nginx -T 2>&1 | grep "server_name.*152.42.239.238" | sed 's/^/   /'
else
    echo "✅ PASS: No IP addresses in server_name"
fi

echo ""

# Summary
echo "========================================="
echo "QA TEST SUMMARY"
echo "========================================="
echo ""

FAILURES=0

[ "$FRONTEND_RUNNING" -ne 1 ] && FAILURES=$((FAILURES+1))
[ "$BACKEND_RUNNING" -ne 1 ] && FAILURES=$((FAILURES+1))
[ "$POSTGRES_RUNNING" -ne 1 ] && FAILURES=$((FAILURES+1))
[ "$MQTT_RUNNING" -ne 1 ] && FAILURES=$((FAILURES+1))

if [ $FAILURES -gt 0 ]; then
    echo "❌ FAILED: $FAILURES container(s) not running"
    echo ""
    echo "Fix: cd $PROJECT_DIR && docker-compose up -d"
else
    echo "✅ PASS: All containers running"
fi

echo ""
echo "Next steps if tests failed:"
echo "  1. Start containers: cd $PROJECT_DIR && docker-compose up -d"
echo "  2. Check logs: docker-compose logs"
echo "  3. Fix Nginx: sudo bash $PROJECT_DIR/scripts/add-iot-namisense-to-nginx.sh"
echo "  4. Reload Nginx: sudo systemctl reload nginx"

