#!/bin/bash

# Fix Nginx server_name conflict - ensure iot.namisense.com is matched correctly
# This script ensures iot.namisense.com doesn't get caught by other server blocks

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG_FILE="$NGINX_AVAILABLE/iot.namisense.com"
NGINX_MAIN_CONFIG="/etc/nginx/nginx.conf"

echo "🔍 Diagnosing Nginx server_name conflict..."
echo "   Checking which server block is catching iot.namisense.com"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Function to check current Nginx config
check_current_config() {
    echo "📋 Checking current Nginx configuration..."
    echo ""
    
    echo "Enabled sites:"
    ls -1 "$NGINX_ENABLED" 2>/dev/null || echo "  (none)"
    echo ""
    
    echo "Checking for server blocks that might catch iot.namisense.com:"
    echo ""
    
    # Check all enabled configs for server_name directives
    for config in "$NGINX_ENABLED"/*; do
        if [ -f "$config" ] || [ -L "$config" ]; then
            real_config=$(readlink -f "$config" 2>/dev/null || echo "$config")
            echo "File: $(basename $config)"
            grep -E "server_name|listen" "$real_config" 2>/dev/null | head -5 || true
            echo ""
        fi
    done
    
    # Check main nginx.conf for default server
    if [ -f "$NGINX_MAIN_CONFIG" ]; then
        echo "Checking main nginx.conf for default server blocks:"
        grep -E "server_name|listen.*default" "$NGINX_MAIN_CONFIG" 2>/dev/null | head -10 || echo "  (none found)"
        echo ""
    fi
}

# Function to create proper iot.namisense.com config
create_iot_config() {
    echo "📝 Creating/updating iot.namisense.com configuration..."
    
    # Create SSL directory
    mkdir -p "/etc/nginx/ssl/iot.namisense.com"
    
    # Generate SSL cert if needed
    if [ ! -f "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" ]; then
        echo "📝 Generating self-signed SSL certificate..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "/etc/nginx/ssl/iot.namisense.com/privkey.pem" \
            -out "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=iot.namisense.com" 2>/dev/null || true
    fi
    
    # Create config with explicit server_name matching
    cat > "$NGINX_CONFIG_FILE" << 'NGINXCONF'
# IOT_Web3 Service - iot.namisense.com
# IMPORTANT: This server block MUST match iot.namisense.com specifically
# and NOT be caught by other server blocks

# HTTP - Redirect to HTTPS
server {
    listen 80;
    # Explicit server_name - only match iot.namisense.com exactly
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
    # Explicit server_name - only match iot.namisense.com exactly
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

    echo "✅ Created configuration file: $NGINX_CONFIG_FILE"
}

# Function to check for conflicting server blocks
check_conflicts() {
    echo "🔍 Checking for conflicting server blocks..."
    
    # Check if any other config has a catch-all or default server
    conflicts_found=0
    
    for config in "$NGINX_ENABLED"/*; do
        if [ -f "$config" ] || [ -L "$config" ]; then
            real_config=$(readlink -f "$config" 2>/dev/null || echo "$config")
            config_name=$(basename "$config")
            
            # Skip our own config
            if [ "$config_name" = "iot.namisense.com" ]; then
                continue
            fi
            
            # Check for default server or catch-all server_name
            if grep -q "listen.*default_server" "$real_config" 2>/dev/null; then
                echo "⚠️  WARNING: $config_name has default_server directive"
                conflicts_found=1
            fi
            
            # Check for server_name with wildcard or _ (catch-all)
            if grep -E "server_name.*\*|server_name.*_" "$real_config" 2>/dev/null; then
                echo "⚠️  WARNING: $config_name has wildcard or catch-all server_name"
                conflicts_found=1
            fi
            
            # Check if it has server_name that includes IP or multiple domains
            if grep -q "server_name.*152.42.239.238" "$real_config" 2>/dev/null; then
                echo "⚠️  WARNING: $config_name includes IP address (might catch all requests)"
                conflicts_found=1
            fi
        fi
    done
    
    if [ $conflicts_found -eq 0 ]; then
        echo "✅ No obvious conflicts found"
    else
        echo ""
        echo "⚠️  Conflicts detected. The iot.namisense.com config should still work"
        echo "    because Nginx matches exact server_name first."
    fi
    echo ""
}

# Function to ensure config is enabled and has priority
enable_config() {
    echo "🔗 Enabling iot.namisense.com configuration..."
    
    # Remove old symlink if exists
    rm -f "$NGINX_ENABLED/iot.namisense.com"
    
    # Create new symlink
    mkdir -p "$NGINX_ENABLED"
    ln -s "$NGINX_CONFIG_FILE" "$NGINX_ENABLED/iot.namisense.com"
    
    echo "✅ Enabled iot.namisense.com"
    
    # Note: Nginx processes server blocks in order, but exact server_name matches
    # take precedence over default_server or catch-all blocks
    echo ""
    echo "ℹ️  Note: Nginx will match exact server_name first, so iot.namisense.com"
    echo "    should take precedence over default_server blocks."
}

# Function to test configuration
test_config() {
    echo "🧪 Testing Nginx configuration..."
    
    if nginx -t 2>&1; then
        echo "✅ Nginx configuration is valid"
        return 0
    else
        echo "❌ Nginx configuration test failed!"
        echo ""
        echo "Please check the error above and fix any issues."
        return 1
    fi
}

# Function to reload Nginx
reload_nginx() {
    echo "🔄 Reloading Nginx..."
    
    if systemctl reload nginx 2>/dev/null; then
        echo "✅ Nginx reloaded successfully"
    else
        echo "⚠️  Reload failed, attempting restart..."
        if systemctl restart nginx; then
            echo "✅ Nginx restarted successfully"
        else
            echo "❌ Failed to restart Nginx"
            return 1
        fi
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "Fix Nginx server_name Conflict"
    echo "========================================="
    echo ""
    
    # Check current config
    check_current_config
    
    # Create/update iot.namisense.com config
    create_iot_config
    
    # Check for conflicts
    check_conflicts
    
    # Enable the config
    enable_config
    
    # Test configuration
    if ! test_config; then
        exit 1
    fi
    
    # Reload Nginx
    if ! reload_nginx; then
        exit 1
    fi
    
    echo ""
    echo "========================================="
    echo "✅ Configuration updated!"
    echo "========================================="
    echo ""
    echo "🧪 Test the configuration:"
    echo "   curl -H 'Host: iot.namisense.com' http://localhost"
    echo "   curl -I http://iot.namisense.com"
    echo "   curl -I https://iot.namisense.com"
    echo ""
    echo "📋 Verify it's working:"
    echo "   curl -v https://iot.namisense.com/health 2>&1 | grep -i 'HTTP\|server'"
    echo ""
    echo "📝 If you still get redirected to ade.dhammada.com:"
    echo "   1. Check: grep -r 'default_server' /etc/nginx/"
    echo "   2. Check: grep -r 'server_name.*_' /etc/nginx/"
    echo "   3. Check: grep -r '152.42.239.238' /etc/nginx/"
    echo "   4. The iot.namisense.com config should be loaded first"
}

main "$@"

