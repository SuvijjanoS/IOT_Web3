#!/bin/bash

# Restart All Services Script
# Run this script on the server after a reboot to start all services

set -e

echo "🔄 Restarting IoT Web3 Services"
echo "================================"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# If running on server, use /root/IOT_web3
if [ -d "/root/IOT_web3" ]; then
    PROJECT_DIR="/root/IOT_web3"
fi

cd "$PROJECT_DIR"

echo "📂 Project directory: $PROJECT_DIR"
echo ""

# Check if Docker is running
echo "🐳 Checking Docker..."
if ! systemctl is-active --quiet docker; then
    echo "⚠️  Docker is not running. Starting Docker..."
    systemctl start docker
    sleep 3
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "⚠️  docker-compose.yml not found. Creating from example..."
    if [ -f "docker-compose.example.yml" ]; then
        cp docker-compose.example.yml docker-compose.yml
        echo "⚠️  Please configure docker-compose.yml with your environment variables!"
    else
        echo "❌ docker-compose.example.yml not found. Cannot proceed."
        exit 1
    fi
fi

# Start Docker Compose services
echo ""
echo "🚀 Starting Docker Compose services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service status
echo ""
echo "📊 Docker Compose service status:"
docker-compose ps

# Check Nginx
echo ""
echo "🌐 Checking Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "⚠️  Nginx is not running. Starting Nginx..."
    systemctl start nginx
    sleep 2
fi

# Fix Nginx configuration for web3iot.dhammada.com
echo ""
echo "🌐 Configuring Nginx for web3iot.dhammada.com..."

# Create nginx config if it doesn't exist
if [ ! -f "/etc/nginx/sites-available/web3iot.dhammada.com" ]; then
    echo "📝 Creating nginx configuration for web3iot.dhammada.com..."
    cat > /etc/nginx/sites-available/web3iot.dhammada.com << 'NGINXCONF'
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
    
    # Enable the site
    rm -f /etc/nginx/sites-enabled/web3iot.dhammada.com
    ln -s /etc/nginx/sites-available/web3iot.dhammada.com /etc/nginx/sites-enabled/web3iot.dhammada.com
    echo "✅ Nginx configuration created"
fi

# Verify and reload Nginx configuration
echo "🧪 Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully"
else
    echo "⚠️  Nginx config test failed, but continuing..."
fi

# Wait a bit more for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Health checks
echo ""
echo "🏥 Running health checks..."
echo ""

# Check backend health
echo "Checking backend health..."
if curl -s -f http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is healthy"
    curl -s http://localhost:3001/health | head -c 100
    echo ""
else
    echo "⚠️  Backend health check failed (may still be starting)"
fi

# Check frontend
echo ""
echo "Checking frontend..."
if curl -s -f http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is responding"
else
    echo "⚠️  Frontend check failed (may still be starting)"
fi

# Check database
echo ""
echo "Checking database connection..."
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ Database is ready"
else
    echo "⚠️  Database check failed (may still be starting)"
fi

# Check MQTT
echo ""
echo "Checking MQTT broker..."
if docker-compose ps mqtt | grep -q "Up"; then
    echo "✅ MQTT container is running"
else
    echo "⚠️  MQTT container is not running"
fi

# Summary
echo ""
echo "================================"
echo "✅ Service restart complete!"
echo ""
echo "Service URLs:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):3001/health"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  View backend log: docker-compose logs -f backend"
echo "  Restart service:  docker-compose restart <service-name>"
echo "  Stop all:         docker-compose down"
echo "  Status:           docker-compose ps"
echo ""

