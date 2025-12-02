#!/bin/bash

# Fix Nginx configuration for web3iot.dhammada.com
# Run this script directly on the server

set -e

echo "🌐 Fixing Nginx configuration for web3iot.dhammada.com"
echo "======================================================"
echo ""

# Determine project directory
if [ -d "/root/IOT_web3" ]; then
    PROJECT_DIR="/root/IOT_web3"
elif [ -d "/root/IOT_web3" ]; then
    PROJECT_DIR="/root/IOT_web3"
else
    echo "⚠️  Project directory not found. Using current directory."
    PROJECT_DIR="$(pwd)"
fi

echo "📂 Project directory: $PROJECT_DIR"
echo ""

# Check if nginx-web3iot.conf exists in project
NGINX_CONFIG_FILE=""
if [ -f "$PROJECT_DIR/nginx-web3iot.conf" ]; then
    NGINX_CONFIG_FILE="$PROJECT_DIR/nginx-web3iot.conf"
elif [ -f "./nginx-web3iot.conf" ]; then
    NGINX_CONFIG_FILE="./nginx-web3iot.conf"
else
    echo "⚠️  nginx-web3iot.conf not found. Creating it..."
    cat > /tmp/web3iot-nginx.conf << 'NGINXCONF'
server {
    listen 80;
    server_name web3iot.dhammada.com;

    # Backend API
    location ~ ^/api(/.*)?$ {
        proxy_pass http://localhost:3001/api$1;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXCONF
    NGINX_CONFIG_FILE="/tmp/web3iot-nginx.conf"
fi

echo "📋 Current nginx sites:"
echo "Available:"
ls -1 /etc/nginx/sites-available/ 2>/dev/null || echo "  (none)"
echo ""
echo "Enabled:"
ls -1 /etc/nginx/sites-enabled/ 2>/dev/null || echo "  (none)"
echo ""

# Backup existing config if it exists
if [ -f "/etc/nginx/sites-available/web3iot.dhammada.com" ]; then
    echo "💾 Backing up existing config..."
    cp /etc/nginx/sites-available/web3iot.dhammada.com /etc/nginx/sites-available/web3iot.dhammada.com.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy new config
echo "📝 Installing nginx configuration..."
cp "$NGINX_CONFIG_FILE" /etc/nginx/sites-available/web3iot.dhammada.com

# Remove old symlink if it exists
rm -f /etc/nginx/sites-enabled/web3iot.dhammada.com

# Create new symlink
ln -s /etc/nginx/sites-available/web3iot.dhammada.com /etc/nginx/sites-enabled/web3iot.dhammada.com

echo "✅ Configuration file installed"
echo ""

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    echo ""
    
    # Show what server_name directives are configured
    echo "📋 Server names in all enabled sites:"
    for site in /etc/nginx/sites-enabled/*; do
        if [ -f "$site" ] && [ ! -L "$site" ] || [ -f "$(readlink -f "$site")" ]; then
            real_site=$(readlink -f "$site" 2>/dev/null || echo "$site")
            echo "  $(basename "$site"):"
            grep -E "^\s*server_name" "$real_site" 2>/dev/null | sed 's/^/    /' || echo "    (no server_name found)"
        fi
    done
    echo ""
    
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration test failed!"
    echo "Please check the error above and fix the configuration."
    exit 1
fi

echo ""
echo "✅ Nginx configuration updated!"
echo ""
echo "web3iot.dhammada.com should now route to your IoT Web3 service (ports 3000/3001)"
echo ""
echo "To verify:"
echo "  curl -H 'Host: web3iot.dhammada.com' http://localhost/health"
echo "  Or visit: http://web3iot.dhammada.com"
echo ""

