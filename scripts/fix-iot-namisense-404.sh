#!/bin/bash

# Fix 404 error for iot.namisense.com
# This script diagnoses and fixes common issues causing 404 errors

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONFIG_FILE="$NGINX_AVAILABLE/iot.namisense.com"
SSL_DIR="/etc/nginx/ssl/iot.namisense.com"

echo "🔍 Diagnosing 404 error for iot.namisense.com..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Function to check Docker containers
check_containers() {
    echo "📦 Checking Docker containers..."
    cd "$PROJECT_DIR"
    
    if ! docker ps --format '{{.Names}}' | grep -q "^iot_web3_frontend$"; then
        echo "⚠️  Frontend container not running. Starting containers..."
        docker-compose up -d
        sleep 5
    else
        echo "✅ Frontend container is running"
    fi
    
    if ! docker ps --format '{{.Names}}' | grep -q "^iot_web3_backend$"; then
        echo "⚠️  Backend container not running"
    else
        echo "✅ Backend container is running"
    fi
    
    # Check if containers are accessible
    if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
        echo "✅ Frontend is accessible on localhost:3000"
    else
        echo "❌ Frontend is NOT accessible on localhost:3000"
        echo "   Checking container logs..."
        docker logs iot_web3_frontend --tail 20
    fi
    
    if curl -sf http://127.0.0.1:3001/health > /dev/null 2>&1; then
        echo "✅ Backend is accessible on localhost:3001"
    else
        echo "❌ Backend is NOT accessible on localhost:3001"
        echo "   Checking container logs..."
        docker logs iot_web3_backend --tail 20
    fi
    echo ""
}

# Function to check Nginx
check_nginx() {
    echo "🌐 Checking Nginx..."
    
    # Check if Nginx is installed
    if ! command -v nginx > /dev/null 2>&1; then
        echo "❌ Nginx is not installed. Installing..."
        apt-get update
        apt-get install -y nginx
    else
        echo "✅ Nginx is installed"
    fi
    
    # Check if Nginx is running
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx service is running"
    else
        echo "⚠️  Nginx service is not running. Starting..."
        systemctl start nginx
        sleep 2
    fi
    
    # Check if config file exists
    if [ -f "$NGINX_CONFIG_FILE" ]; then
        echo "✅ Nginx config file exists: $NGINX_CONFIG_FILE"
    else
        echo "❌ Nginx config file NOT found: $NGINX_CONFIG_FILE"
        echo "   Creating configuration..."
        return 1
    fi
    
    # Check if config is enabled
    if [ -L "$NGINX_ENABLED/iot.namisense.com" ]; then
        echo "✅ Nginx config is enabled"
    else
        echo "⚠️  Nginx config is NOT enabled. Enabling..."
        mkdir -p "$NGINX_ENABLED"
        rm -f "$NGINX_ENABLED/iot.namisense.com"
        ln -s "$NGINX_CONFIG_FILE" "$NGINX_ENABLED/iot.namisense.com"
    fi
    
    # Test Nginx configuration
    if nginx -t > /dev/null 2>&1; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration has errors:"
        nginx -t
        return 1
    fi
    echo ""
}

# Function to check SSL certificates
check_ssl() {
    echo "🔒 Checking SSL certificates..."
    
    if [ -f "$SSL_DIR/fullchain.pem" ] && [ -f "$SSL_DIR/privkey.pem" ]; then
        echo "✅ SSL certificates exist"
        
        # Check certificate validity
        if openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -text > /dev/null 2>&1; then
            echo "✅ SSL certificate is valid"
        else
            echo "⚠️  SSL certificate may be invalid"
        fi
    else
        echo "❌ SSL certificates NOT found. Generating self-signed certificate..."
        mkdir -p "$SSL_DIR"
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SSL_DIR/privkey.pem" \
            -out "$SSL_DIR/fullchain.pem" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=iot.namisense.com" 2>/dev/null || {
            echo "❌ Failed to generate SSL certificate"
            return 1
        }
        echo "✅ Self-signed SSL certificate generated"
    fi
    echo ""
}

# Function to create/update Nginx config
create_nginx_config() {
    echo "📝 Creating/updating Nginx configuration..."
    
    mkdir -p "$NGINX_AVAILABLE" "$NGINX_ENABLED"
    
    # Use config from repository if available
    if [ -f "$PROJECT_DIR/nginx-iot-namisense.conf" ]; then
        cp "$PROJECT_DIR/nginx-iot-namisense.conf" "$NGINX_CONFIG_FILE"
        echo "✅ Copied Nginx config from repository"
    else
        # Create basic HTTP config (no HTTPS redirect for now)
        cat > "$NGINX_CONFIG_FILE" << 'NGINXCONF'
# HTTP configuration for iot.namisense.com
server {
    listen 80;
    server_name iot.namisense.com;

    # Backend API
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

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Frontend
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
        echo "✅ Created basic Nginx config (HTTP only)"
    fi
    
    # Enable the site
    rm -f "$NGINX_ENABLED/iot.namisense.com"
    ln -s "$NGINX_CONFIG_FILE" "$NGINX_ENABLED/iot.namisense.com"
    echo "✅ Enabled Nginx site"
}

# Main diagnostic and fix
main() {
    echo "========================================="
    echo "IOT Namisense 404 Fix Script"
    echo "========================================="
    echo ""
    
    # Check Docker containers first
    check_containers
    
    # Check Nginx
    if ! check_nginx; then
        create_nginx_config
        check_nginx || {
            echo "❌ Failed to configure Nginx"
            exit 1
        }
    fi
    
    # Check SSL (but don't fail if missing - HTTP should work)
    check_ssl || echo "⚠️  SSL check had issues, but HTTP should still work"
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    if nginx -t; then
        systemctl reload nginx || systemctl restart nginx
        echo "✅ Nginx reloaded successfully"
    else
        echo "❌ Nginx configuration test failed!"
        nginx -t
        exit 1
    fi
    
    echo ""
    echo "========================================="
    echo "✅ Fix complete!"
    echo "========================================="
    echo ""
    echo "🧪 Testing endpoints:"
    echo ""
    
    # Test HTTP
    echo "Testing HTTP (port 80):"
    if curl -I http://iot.namisense.com 2>&1 | head -5; then
        echo ""
    fi
    
    # Test localhost
    echo ""
    echo "Testing localhost:3000 (frontend):"
    curl -I http://127.0.0.1:3000 2>&1 | head -3 || echo "❌ Frontend not accessible"
    
    echo ""
    echo "Testing localhost:3001/health (backend):"
    curl -I http://127.0.0.1:3001/health 2>&1 | head -3 || echo "❌ Backend not accessible"
    
    echo ""
    echo "📋 Next steps:"
    echo "  1. Test: curl http://iot.namisense.com"
    echo "  2. Test: curl http://iot.namisense.com/health"
    echo "  3. Check logs: tail -f /var/log/nginx/error.log"
    echo "  4. Check container logs: docker-compose logs -f"
    echo ""
    echo "If HTTPS is needed, generate Let's Encrypt certificates:"
    echo "  certbot certonly --nginx -d iot.namisense.com"
}

main "$@"

