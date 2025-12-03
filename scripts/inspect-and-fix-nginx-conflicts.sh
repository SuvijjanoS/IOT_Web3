#!/bin/bash

# Inspect and fix Nginx configuration to prevent iot.namisense.com from being caught by ade.dhammada.com
# This script examines the actual Nginx config on the server and fixes conflicts

set -e

NGINX_ENABLED="/etc/nginx/sites-enabled"
NGINX_AVAILABLE="/etc/nginx/sites-available"

echo "🔍 Inspecting Nginx configuration for server_name conflicts..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Function to show current server blocks
show_server_blocks() {
    echo "📋 Current server blocks in enabled sites:"
    echo ""
    
    for config in "$NGINX_ENABLED"/*; do
        if [ -f "$config" ] || [ -L "$config" ]; then
            real_config=$(readlink -f "$config" 2>/dev/null || echo "$config")
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "File: $(basename $config)"
            echo "Path: $real_config"
            echo ""
            
            # Extract server blocks
            awk '/^server\s*\{/,/^\s*\}/' "$real_config" 2>/dev/null | grep -E "listen|server_name" | head -10 || true
            echo ""
        fi
    done
}

# Function to check for problematic patterns
check_problems() {
    echo "🔍 Checking for problematic patterns..."
    echo ""
    
    problems_found=0
    
    for config in "$NGINX_ENABLED"/*; do
        if [ -f "$config" ] || [ -L "$config" ]; then
            real_config=$(readlink -f "$config" 2>/dev/null || echo "$config")
            config_name=$(basename "$config")
            
            # Skip iot.namisense.com - we're fixing that
            if [ "$config_name" = "iot.namisense.com" ]; then
                continue
            fi
            
            echo "Checking: $config_name"
            
            # Check for default_server
            if grep -q "listen.*default_server" "$real_config" 2>/dev/null; then
                echo "  ⚠️  Has default_server directive"
                grep "listen.*default_server" "$real_config" 2>/dev/null
                problems_found=1
            fi
            
            # Check for catch-all server_name
            if grep -E "server_name\s+_|server_name\s+\*" "$real_config" 2>/dev/null; then
                echo "  ⚠️  Has catch-all server_name (_ or *)"
                grep -E "server_name\s+_|server_name\s+\*" "$real_config" 2>/dev/null
                problems_found=1
            fi
            
            # Check for IP address in server_name (can act as catch-all)
            if grep -E "server_name.*152\.42\.239\.238|server_name.*[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" "$real_config" 2>/dev/null; then
                echo "  ⚠️  Has IP address in server_name (might catch all requests)"
                grep -E "server_name.*152\.42\.239\.238|server_name.*[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" "$real_config" 2>/dev/null
                problems_found=1
            fi
            
            # Check for multiple server_name values that might include catch-all
            server_names=$(grep "server_name" "$real_config" 2>/dev/null | head -1)
            if [ -n "$server_names" ]; then
                echo "  ℹ️  server_name: $server_names"
            fi
            echo ""
        fi
    done
    
    return $problems_found
}

# Function to ensure iot.namisense.com config exists and is correct
ensure_iot_config() {
    echo "📝 Ensuring iot.namisense.com configuration exists..."
    
    IOT_CONFIG="$NGINX_AVAILABLE/iot.namisense.com"
    
    if [ ! -f "$IOT_CONFIG" ]; then
        echo "  Creating iot.namisense.com configuration..."
        bash "$(dirname $0)/add-iot-namisense-to-nginx.sh" > /dev/null 2>&1 || {
            echo "  ⚠️  Failed to create config, creating manually..."
            mkdir -p "$NGINX_AVAILABLE"
            mkdir -p "/etc/nginx/ssl/iot.namisense.com"
            
            # Generate SSL cert if needed
            if [ ! -f "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" ]; then
                openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                    -keyout "/etc/nginx/ssl/iot.namisense.com/privkey.pem" \
                    -out "/etc/nginx/ssl/iot.namisense.com/fullchain.pem" \
                    -subj "/C=US/ST=State/L=City/O=Organization/CN=iot.namisense.com" 2>/dev/null || true
            fi
            
            cat > "$IOT_CONFIG" << 'EOF'
server {
    listen 80;
    server_name iot.namisense.com;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$server_name$request_uri; }
}
server {
    listen 443 ssl http2;
    server_name iot.namisense.com;
    ssl_certificate /etc/nginx/ssl/iot.namisense.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/iot.namisense.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    location ~ ^/api(/.*)?$ {
        proxy_pass http://127.0.0.1:3001/api$1;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
EOF
        }
    fi
    
    # Ensure it's enabled
    if [ ! -L "$NGINX_ENABLED/iot.namisense.com" ]; then
        echo "  Enabling iot.namisense.com..."
        ln -sf "$IOT_CONFIG" "$NGINX_ENABLED/iot.namisense.com"
    fi
    
    echo "  ✅ iot.namisense.com configuration ready"
}

# Function to rename configs for proper ordering (alphabetical)
# Nginx processes configs in alphabetical order, so we want iot.namisense.com early
ensure_ordering() {
    echo "📋 Ensuring proper config file ordering..."
    
    # Rename iot.namisense.com to start with 'a' so it's processed early
    # Actually, Nginx matches exact server_name first, so order shouldn't matter
    # But let's make sure the file exists and is enabled
    if [ -L "$NGINX_ENABLED/iot.namisense.com" ]; then
        echo "  ✅ iot.namisense.com is enabled"
    else
        echo "  ⚠️  iot.namisense.com is not enabled"
        ensure_iot_config
    fi
}

# Function to test the configuration
test_and_reload() {
    echo "🧪 Testing Nginx configuration..."
    
    if nginx -t 2>&1; then
        echo "  ✅ Configuration is valid"
        echo ""
        echo "🔄 Reloading Nginx..."
        systemctl reload nginx || systemctl restart nginx
        echo "  ✅ Nginx reloaded"
        return 0
    else
        echo "  ❌ Configuration test failed!"
        nginx -t
        return 1
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "Nginx Server Name Conflict Fix"
    echo "========================================="
    echo ""
    
    # Show current configuration
    show_server_blocks
    
    # Check for problems
    if check_problems; then
        echo "⚠️  Problems detected in other configurations"
        echo "   However, Nginx should still match exact server_name first"
        echo ""
    else
        echo "✅ No obvious problems found"
        echo ""
    fi
    
    # Ensure iot.namisense.com config exists
    ensure_iot_config
    
    # Ensure proper ordering
    ensure_ordering
    
    # Test and reload
    if ! test_and_reload; then
        exit 1
    fi
    
    echo ""
    echo "========================================="
    echo "✅ Configuration updated!"
    echo "========================================="
    echo ""
    echo "🧪 Test the fix:"
    echo "   curl -v -H 'Host: iot.namisense.com' http://localhost/health 2>&1 | grep -i 'HTTP\|server'"
    echo "   curl -I http://iot.namisense.com"
    echo "   curl -I https://iot.namisense.com"
    echo ""
    echo "📝 If still redirected to ade.dhammada.com:"
    echo "   1. Check: nginx -T | grep -A 10 'server_name.*iot.namisense.com'"
    echo "   2. Check: nginx -T | grep -B 5 -A 10 'default_server'"
    echo "   3. Verify Docker containers are running: docker ps | grep iot_web3"
}

main "$@"

