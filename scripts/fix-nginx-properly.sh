#!/bin/bash

# Properly fix Nginx to ensure iot.namisense.com is matched correctly
# This script inspects the ACTUAL Nginx config and fixes it properly

set -e

NGINX_ENABLED="/etc/nginx/sites-enabled"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_MAIN="/etc/nginx/nginx.conf"

echo "🔍 Inspecting ACTUAL Nginx configuration..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Show the actual Nginx configuration
echo "📋 Full Nginx configuration (nginx -T):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
nginx -T 2>&1 | grep -A 20 "server_name\|listen.*default" | head -100
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check what server blocks exist
echo "📋 All server blocks:"
nginx -T 2>&1 | grep -B 2 -A 15 "server {" | grep -E "server_name|listen" | head -50
echo ""

# Find which server block would match iot.namisense.com
echo "🔍 Testing which server block matches iot.namisense.com..."
echo ""

# Create a test request and see what happens
echo "Testing HTTP request:"
curl -v -H "Host: iot.namisense.com" http://localhost/health 2>&1 | grep -i "HTTP\|server\|location" | head -10 || echo "  (test failed)"
echo ""

# Check for default_server
echo "🔍 Checking for default_server directives:"
nginx -T 2>&1 | grep -B 5 -A 10 "default_server" || echo "  (none found)"
echo ""

# Check for catch-all server_name
echo "🔍 Checking for catch-all server_name patterns:"
nginx -T 2>&1 | grep -B 2 -A 5 "server_name.*_\|server_name.*\*\|server_name.*[0-9]" || echo "  (none found)"
echo ""

# Now fix it properly
echo "========================================="
echo "FIXING CONFIGURATION"
echo "========================================="
echo ""

# Ensure iot.namisense.com config exists and is CORRECT
IOT_CONFIG="$NGINX_AVAILABLE/iot.namisense.com"

echo "📝 Creating/updating iot.namisense.com config..."

# Create SSL directory and cert if needed
mkdir -p "/etc/nginx/ssl/iot.namisense.com"
if [ ! -f "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "/etc/nginx/ssl/iot.namisense.com/privkey.pem" \
        -out "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=iot.namisense.com" 2>/dev/null || true
fi

# Create the config file with EXPLICIT server_name
cat > "$IOT_CONFIG" << 'NGINXCONF'
# IOT_Web3 Service - iot.namisense.com
# This MUST match iot.namisense.com and nothing else

server {
    listen 80;
    server_name iot.namisense.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name iot.namisense.com;
    
    ssl_certificate /etc/nginx/ssl/iot.namisense.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/iot.namisense.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    location ~ ^/api(/.*)?$ {
        proxy_pass http://127.0.0.1:3001/api$1;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXCONF

echo "✅ Created config: $IOT_CONFIG"

# Enable it with a name that comes FIRST alphabetically
# Nginx processes files in alphabetical order, so we want this early
rm -f "$NGINX_ENABLED/iot.namisense.com"
ln -sf "$IOT_CONFIG" "$NGINX_ENABLED/00-iot.namisense.com"

echo "✅ Enabled as: 00-iot.namisense.com (processed first)"

# Check for and remove default_server from other configs
echo ""
echo "🔧 Checking other configs for problematic patterns..."

for config in "$NGINX_ENABLED"/*; do
    if [ -f "$config" ] || [ -L "$config" ]; then
        real_config=$(readlink -f "$config" 2>/dev/null || echo "$config")
        config_name=$(basename "$config")
        
        # Skip our config
        if [[ "$config_name" == *"iot.namisense"* ]]; then
            continue
        fi
        
        # Check if it has default_server
        if grep -q "default_server" "$real_config" 2>/dev/null; then
            echo "  ⚠️  Found default_server in: $config_name"
            echo "     Removing default_server..."
            
            # Backup
            cp "$real_config" "${real_config}.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Remove default_server
            sed -i 's/default_server//g' "$real_config" 2>/dev/null || true
            sed -i 's/listen\(.*\)default_server\(.*\)/listen\1\2/' "$real_config" 2>/dev/null || true
            
            echo "     ✅ Removed default_server"
        fi
        
        # Check if server_name has IP address
        if grep -E "server_name.*152\.42\.239\.238" "$real_config" 2>/dev/null; then
            echo "  ⚠️  Found IP in server_name in: $config_name"
            echo "     Removing IP address..."
            
            # Backup if not already backed up
            if [ ! -f "${real_config}.backup"* ]; then
                cp "$real_config" "${real_config}.backup.$(date +%Y%m%d_%H%M%S)"
            fi
            
            # Remove IP but keep domain names
            sed -i 's/152\.42\.239\.238//g' "$real_config" 2>/dev/null || true
            
            echo "     ✅ Removed IP address"
        fi
    fi
done

# Test configuration
echo ""
echo "🧪 Testing Nginx configuration..."
if nginx -t 2>&1; then
    echo "✅ Configuration is valid"
else
    echo "❌ Configuration test failed!"
    nginx -t
    exit 1
fi

# Reload Nginx
echo ""
echo "🔄 Reloading Nginx..."
systemctl reload nginx || systemctl restart nginx
echo "✅ Nginx reloaded"

echo ""
echo "========================================="
echo "✅ FIX COMPLETE"
echo "========================================="
echo ""
echo "🧪 Test now:"
echo "   curl -I http://iot.namisense.com"
echo "   curl -I https://iot.namisense.com"
echo ""
echo "📋 If still wrong, check:"
echo "   nginx -T | grep -B 5 -A 10 'iot.namisense.com'"
echo "   nginx -T | grep -B 5 -A 10 'default_server'"

