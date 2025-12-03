#!/bin/bash

# Add iot.namisense.com to existing Nginx configuration
# This script adds the IOT_Web3 service to the existing Nginx config
# WITHOUT overriding or breaking other services (ADE, Minecraft, etc.)

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG_FILE="$NGINX_AVAILABLE/iot.namisense.com"
SSL_DIR="/etc/nginx/ssl/iot.namisense.com"

echo "🔧 Adding iot.namisense.com to existing Nginx configuration..."
echo "   (This will NOT override other services)"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if Nginx is installed
if ! command -v nginx > /dev/null 2>&1; then
    echo "❌ Nginx is not installed. Please install Nginx first."
    exit 1
fi

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Check if SSL certificates exist, create self-signed if not
if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
    echo "📝 Generating self-signed SSL certificate for iot.namisense.com..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=iot.namisense.com" 2>/dev/null || {
        echo "⚠️  Failed to generate SSL certificate, but continuing..."
    }
fi

# Create Nginx configuration for iot.namisense.com
echo "📝 Creating Nginx configuration for iot.namisense.com..."

cat > "$NGINX_CONFIG_FILE" << 'NGINXCONF'
# IOT_Web3 Service - iot.namisense.com
# This configuration proxies to IOT_Web3 Docker containers

# HTTP - Redirect to HTTPS (but allow Let's Encrypt)
server {
    listen 80;
    server_name iot.namisense.com;

    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - Main configuration
server {
    listen 443 ssl http2;
    server_name iot.namisense.com;

    # SSL Certificate paths
    ssl_certificate /etc/nginx/ssl/iot.namisense.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/iot.namisense.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Backend API - must come before frontend to avoid conflicts
    location ~ ^/api(/.*)?$ {
        proxy_pass http://127.0.0.1:3001/api$1;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        # Increase timeouts for blockchain operations
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # Frontend - serve React app (all other routes)
    # React Router handles client-side routing
    location / {
        proxy_pass http://127.0.0.1:3000;
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
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logging
    access_log /var/log/nginx/iot.namisense.com.access.log;
    error_log /var/log/nginx/iot.namisense.com.error.log;
}
NGINXCONF

echo "✅ Created Nginx configuration file: $NGINX_CONFIG_FILE"

# Enable the site (only if not already enabled)
if [ ! -L "$NGINX_ENABLED/iot.namisense.com" ]; then
    echo "🔗 Enabling Nginx site..."
    mkdir -p "$NGINX_ENABLED"
    ln -s "$NGINX_CONFIG_FILE" "$NGINX_ENABLED/iot.namisense.com"
    echo "✅ Enabled iot.namisense.com site"
else
    echo "ℹ️  Site already enabled: $NGINX_ENABLED/iot.namisense.com"
fi

# Test Nginx configuration
echo ""
echo "🧪 Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed!"
    echo ""
    echo "⚠️  Configuration test failed. Please check:"
    echo "   1. Other services' configurations are intact"
    echo "   2. No port conflicts"
    echo "   3. SSL certificates are valid"
    echo ""
    echo "To see the error:"
    echo "   nginx -t"
    exit 1
fi

# Show what other sites are configured
echo ""
echo "📋 Currently enabled Nginx sites:"
ls -1 "$NGINX_ENABLED" 2>/dev/null || echo "  (none found)"
echo ""

# Reload Nginx
echo "🔄 Reloading Nginx..."
if systemctl reload nginx 2>/dev/null; then
    echo "✅ Nginx reloaded successfully"
else
    echo "⚠️  Reload failed, attempting restart..."
    systemctl restart nginx
    echo "✅ Nginx restarted"
fi

echo ""
echo "========================================="
echo "✅ iot.namisense.com added to Nginx!"
echo "========================================="
echo ""
echo "📋 Summary:"
echo "  - Config file: $NGINX_CONFIG_FILE"
echo "  - Enabled at: $NGINX_ENABLED/iot.namisense.com"
echo "  - SSL certificates: $SSL_DIR"
echo "  - Frontend proxy: http://127.0.0.1:3000"
echo "  - Backend proxy: http://127.0.0.1:3001"
echo ""
echo "🧪 Test the configuration:"
echo "   curl -I http://iot.namisense.com"
echo "   curl -I https://iot.namisense.com"
echo "   curl https://iot.namisense.com/health"
echo ""
echo "📝 Note: This configuration works alongside your other services."
echo "   Other services (ADE, Minecraft, etc.) are NOT affected."
echo ""
echo "🔒 To generate Let's Encrypt certificates:"
echo "   certbot certonly --nginx -d iot.namisense.com"

