#!/bin/bash

# Setup Nginx configuration for iot.namisense.com
# This script configures Nginx to proxy to IOT_Web3 Docker containers

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG_FILE="$NGINX_AVAILABLE/iot.namisense.com"
SSL_DIR="/etc/nginx/ssl/iot.namisense.com"

echo "🔧 Setting up Nginx configuration for iot.namisense.com..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Ensure nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Check if SSL certificates exist
if [ ! -f "$SSL_DIR/fullchain.pem" ] || [ ! -f "$SSL_DIR/privkey.pem" ]; then
    echo "⚠️  SSL certificates not found at $SSL_DIR"
    echo "📝 Generating self-signed certificate for testing (replace with Let's Encrypt later)..."
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=iot.namisense.com" \
        2>/dev/null || {
        echo "❌ Failed to generate self-signed certificate"
        echo "💡 You can generate Let's Encrypt certificates later with:"
        echo "   certbot certonly --nginx -d iot.namisense.com"
    }
fi

# Copy nginx configuration
if [ -f "$PROJECT_DIR/nginx-iot-namisense.conf" ]; then
    echo "📋 Copying Nginx configuration from repository..."
    cp "$PROJECT_DIR/nginx-iot-namisense.conf" "$NGINX_CONFIG_FILE"
else
    echo "⚠️  Repository config not found, creating from template..."
    cat > "$NGINX_CONFIG_FILE" << 'NGINXCONF'
# HTTP - Redirect to HTTPS
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

# HTTPS
server {
    listen 443 ssl http2;
    server_name iot.namisense.com;

    ssl_certificate /etc/nginx/ssl/iot.namisense.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/iot.namisense.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
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
fi

# Enable the site
echo "🔗 Enabling Nginx site..."
rm -f "$NGINX_ENABLED/iot.namisense.com"
ln -s "$NGINX_CONFIG_FILE" "$NGINX_ENABLED/iot.namisense.com"

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi

# Reload Nginx
echo "🔄 Reloading Nginx..."
systemctl reload nginx || systemctl restart nginx

echo ""
echo "✅ Nginx configuration for iot.namisense.com is complete!"
echo ""
echo "📋 Summary:"
echo "  - Config file: $NGINX_CONFIG_FILE"
echo "  - SSL certificates: $SSL_DIR"
echo "  - Frontend proxy: http://127.0.0.1:3000"
echo "  - Backend proxy: http://127.0.0.1:3001"
echo ""
echo "🔒 To generate Let's Encrypt certificates:"
echo "   certbot certonly --nginx -d iot.namisense.com"
echo ""
echo "🧪 Test the configuration:"
echo "   curl -I http://iot.namisense.com"
echo "   curl -I https://iot.namisense.com"

