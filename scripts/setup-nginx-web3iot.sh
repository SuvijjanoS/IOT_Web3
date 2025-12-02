#!/bin/bash

# Setup Nginx configuration for web3iot.dhammada.com
# This script sets up the nginx config on the server

set -e

SERVER_IP="152.42.239.238"
SERVER_USER="root"
SERVER_PASSWORD="dThrong290980"

echo "🌐 Setting up Nginx configuration for web3iot.dhammada.com"
echo "=========================================================="
echo ""

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "Please install sshpass: sudo apt-get install sshpass"
        exit 1
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NGINX_CONFIG="$PROJECT_DIR/nginx-web3iot.conf"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ nginx-web3iot.conf not found at $NGINX_CONFIG"
    exit 1
fi

echo "📤 Uploading nginx configuration..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no "$NGINX_CONFIG" $SERVER_USER@$SERVER_IP:/tmp/web3iot-nginx.conf

echo ""
echo "🔧 Installing nginx configuration on server..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
# Copy config to sites-available
cp /tmp/web3iot-nginx.conf /etc/nginx/sites-available/web3iot.dhammada.com

# Remove old symlink if it exists
rm -f /etc/nginx/sites-enabled/web3iot.dhammada.com

# Create new symlink
ln -s /etc/nginx/sites-available/web3iot.dhammada.com /etc/nginx/sites-enabled/web3iot.dhammada.com

# Test nginx configuration
echo "Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Show enabled sites
echo ""
echo "📋 Enabled nginx sites:"
ls -la /etc/nginx/sites-enabled/

# Show server_name from each config
echo ""
echo "📋 Server names configured:"
for site in /etc/nginx/sites-enabled/*; do
    if [ -f "$site" ]; then
        echo "  $site:"
        grep -E "^\s*server_name" "$site" | head -1 || echo "    (no server_name found)"
    fi
done

ENDSSH

echo ""
echo "✅ Nginx configuration updated!"
echo ""
echo "The web3iot.dhammada.com domain should now route to your IoT Web3 service."
echo ""
echo "To verify, visit: http://web3iot.dhammada.com"
echo ""

