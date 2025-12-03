#!/bin/bash
#
# Deploy Security Fix to Remote Server
# Applies security remediation immediately
#

set -e

SERVER_IP="${SERVER_IP:-152.42.239.238}"
SERVER_USER="${SERVER_USER:-root}"
PROJECT_DIR="/root/IOT_Web3"

echo "🔒 Deploying Security Fix to Server"
echo "===================================="
echo "Server: $SERVER_USER@$SERVER_IP"
echo ""

# Pull latest changes on server
echo "1. Pulling latest changes from GitHub..."
ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && git pull origin main" || {
    echo "Error: Failed to pull changes"
    exit 1
}

# Run security remediation script
echo ""
echo "2. Running security remediation script..."
ssh "$SERVER_USER@$SERVER_IP" "sudo bash $PROJECT_DIR/scripts/secure-redis-and-services.sh" || {
    echo "Error: Security remediation failed"
    exit 1
}

# Restart services
echo ""
echo "3. Restarting services with secure configuration..."
ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker-compose down && docker-compose up -d" || {
    echo "Error: Failed to restart services"
    exit 1
}

# Verify security
echo ""
echo "4. Verifying security configuration..."
ssh "$SERVER_USER@$SERVER_IP" "netstat -tlnp 2>/dev/null | grep -E '5433|1883|3001|3000|6379' | head -10" || true

echo ""
echo "✅ Security fix deployed successfully!"
echo ""
echo "Next steps:"
echo "  - Verify services are bound to 127.0.0.1 only"
echo "  - Test external access (should fail)"
echo "  - Test through Nginx (should work)"

