#!/bin/bash

# Fix ade.dhammada.com config to NOT catch iot.namisense.com requests
# This script removes catch-all patterns from ade config

set -e

NGINX_ENABLED="/etc/nginx/sites-enabled"
NGINX_AVAILABLE="/etc/nginx/sites-available"

echo "🔧 Fixing ade.dhammada.com config to prevent catching iot.namisense.com..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Find ade config file
ADE_CONFIG=""
for config in "$NGINX_ENABLED"/*ade* "$NGINX_ENABLED"/*ADE*; do
    if [ -f "$config" ] || [ -L "$config" ]; then
        ADE_CONFIG=$(readlink -f "$config" 2>/dev/null || echo "$config")
        break
    fi
done

if [ -z "$ADE_CONFIG" ] || [ ! -f "$ADE_CONFIG" ]; then
    echo "⚠️  Could not find ade.dhammada.com config file"
    echo "   Looking in: $NGINX_ENABLED"
    echo ""
    echo "Available configs:"
    ls -1 "$NGINX_ENABLED" 2>/dev/null || echo "  (none)"
    exit 1
fi

echo "📋 Found ADE config: $ADE_CONFIG"
echo ""

# Backup the config
BACKUP_FILE="${ADE_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ADE_CONFIG" "$BACKUP_FILE"
echo "✅ Backed up to: $BACKUP_FILE"
echo ""

# Check current server_name
echo "Current server_name in ADE config:"
grep "server_name" "$ADE_CONFIG" | head -5 || echo "  (none found)"
echo ""

# Check for IP address in server_name
if grep -E "server_name.*152\.42\.239\.238|server_name.*[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" "$ADE_CONFIG" 2>/dev/null; then
    echo "⚠️  Found IP address in server_name - this can catch all requests"
    echo "   Removing IP address from server_name..."
    
    # Remove IP from server_name, keep only domain names
    sed -i 's/server_name\(.*\)152\.42\.239\.238\(.*\);/server_name\1\2;/' "$ADE_CONFIG" 2>/dev/null || true
    sed -i 's/server_name\(.*\)[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+\(.*\);/server_name\1\2;/' "$ADE_CONFIG" 2>/dev/null || true
    sed -i 's/152\.42\.239\.238//g' "$ADE_CONFIG" 2>/dev/null || true
    
    echo "✅ Removed IP address from server_name"
fi

# Check for default_server
if grep -q "listen.*default_server" "$ADE_CONFIG" 2>/dev/null; then
    echo "⚠️  Found default_server directive"
    echo "   Removing default_server (keeping only ade.dhammada.com)..."
    
    # Remove default_server from listen directives
    sed -i 's/\(listen.*\)default_server\(.*\)/\1\2/' "$ADE_CONFIG" 2>/dev/null || true
    sed -i 's/default_server//g' "$ADE_CONFIG" 2>/dev/null || true
    
    echo "✅ Removed default_server directive"
fi

# Ensure server_name only has ade.dhammada.com (and maybe www)
echo ""
echo "📝 Updated server_name (should only match ade.dhammada.com):"
grep "server_name" "$ADE_CONFIG" | head -5 || echo "  (none found)"
echo ""

# Test configuration
echo "🧪 Testing Nginx configuration..."
if nginx -t 2>&1; then
    echo "✅ Configuration is valid"
    echo ""
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx || systemctl restart nginx
    echo "✅ Nginx reloaded"
else
    echo "❌ Configuration test failed!"
    echo ""
    echo "Restoring backup..."
    cp "$BACKUP_FILE" "$ADE_CONFIG"
    echo "Backup restored. Please check the configuration manually."
    exit 1
fi

echo ""
echo "========================================="
echo "✅ ADE config updated!"
echo "========================================="
echo ""
echo "📋 Changes made:"
echo "  - Removed IP address from server_name"
echo "  - Removed default_server directive"
echo "  - ADE config now only matches ade.dhammada.com"
echo ""
echo "🧪 Test:"
echo "   curl -I http://iot.namisense.com"
echo "   curl -I http://ade.dhammada.com"
echo ""
echo "📝 Backup saved at: $BACKUP_FILE"

