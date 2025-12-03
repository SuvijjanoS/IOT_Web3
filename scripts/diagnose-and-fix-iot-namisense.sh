#!/bin/bash

# Comprehensive diagnostic and fix for iot.namisense.com
# This script checks EVERYTHING and fixes it properly

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"

echo "========================================="
echo "COMPREHENSIVE DIAGNOSTIC AND FIX"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Step 1: Check Docker containers
echo "1️⃣  Checking Docker containers..."
cd "$PROJECT_DIR" 2>/dev/null || {
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
}

if ! docker ps | grep -q "iot_web3_frontend"; then
    echo "⚠️  Frontend container not running. Starting containers..."
    docker-compose up -d
    sleep 5
fi

if ! docker ps | grep -q "iot_web3_backend"; then
    echo "⚠️  Backend container not running. Starting containers..."
    docker-compose up -d
    sleep 5
fi

echo "✅ Containers status:"
docker ps | grep iot_web3 || echo "  (containers not found)"
echo ""

# Step 2: Check if ports are accessible
echo "2️⃣  Checking if ports are accessible..."
if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
    echo "✅ Frontend (port 3000) is accessible"
else
    echo "❌ Frontend (port 3000) is NOT accessible"
    echo "   Container logs:"
    docker logs iot_web3_frontend --tail 20 2>&1 | head -10
fi

if curl -sf http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo "✅ Backend (port 3001) is accessible"
else
    echo "❌ Backend (port 3001) is NOT accessible"
    echo "   Container logs:"
    docker logs iot_web3_backend --tail 20 2>&1 | head -10
fi
echo ""

# Step 3: Check Nginx configuration
echo "3️⃣  Checking Nginx configuration..."

# Show what server blocks exist
echo "All server blocks:"
nginx -T 2>&1 | grep -E "server_name|listen" | head -30
echo ""

# Check what matches iot.namisense.com
echo "Server blocks that might match iot.namisense.com:"
nginx -T 2>&1 | grep -B 3 -A 10 "iot.namisense.com" || echo "  (none found)"
echo ""

# Step 4: Create CORRECT Nginx config
echo "4️⃣  Creating correct Nginx configuration..."

NGINX_CONFIG="/etc/nginx/sites-available/iot.namisense.com"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# Remove any existing configs
rm -f "$NGINX_ENABLED"/*iot.namisense* 2>/dev/null || true

# Create SSL directory
mkdir -p "/etc/nginx/ssl/iot.namisense.com"
if [ ! -f "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "/etc/nginx/ssl/iot.namisense.com/privkey.pem" \
        -out "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=iot.namisense.com" 2>/dev/null || true
fi

# Create the config - SIMPLE and EXPLICIT
cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 80;
    server_name iot.namisense.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name iot.namisense.com;
    
    ssl_certificate /etc/nginx/ssl/iot.namisense.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/iot.namisense.com/privkey.pem;
    
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

echo "✅ Created config: $NGINX_CONFIG"

# Enable it
ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED/iot.namisense.com"
echo "✅ Enabled config"

# Step 5: Remove default_server from ALL other configs
echo ""
echo "5️⃣  Removing default_server from other configs..."

for config in /etc/nginx/sites-enabled/*; do
    if [ -f "$config" ] || [ -L "$config" ]; then
        real_config=$(readlink -f "$config" 2>/dev/null || echo "$config")
        if [[ "$(basename $config)" != *"iot.namisense"* ]]; then
            if grep -q "default_server" "$real_config" 2>/dev/null; then
                echo "  Removing default_server from: $(basename $config)"
                cp "$real_config" "${real_config}.backup.$(date +%Y%m%d_%H%M%S)"
                sed -i 's/default_server//g' "$real_config" 2>/dev/null || true
            fi
        fi
    fi
done

# Step 6: Test and reload
echo ""
echo "6️⃣  Testing Nginx configuration..."
if nginx -t 2>&1; then
    echo "✅ Configuration is valid"
    systemctl reload nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Configuration test failed!"
    nginx -t
    exit 1
fi

# Step 7: Test the actual routing
echo ""
echo "7️⃣  Testing routing..."
echo ""
echo "Testing with Host header:"
curl -v -H "Host: iot.namisense.com" http://127.0.0.1/health 2>&1 | grep -i "HTTP\|server\|location" | head -5
echo ""
echo "Testing direct domain:"
curl -I http://iot.namisense.com 2>&1 | head -5
echo ""

echo "========================================="
echo "✅ DIAGNOSTIC COMPLETE"
echo "========================================="
echo ""
echo "If it's still not working, check:"
echo "  1. DNS: dig iot.namisense.com"
echo "  2. Containers: docker ps | grep iot_web3"
echo "  3. Ports: netstat -tlnp | grep -E '3000|3001'"
echo "  4. Nginx: nginx -T | grep -A 10 'iot.namisense.com'"

