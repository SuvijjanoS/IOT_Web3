#!/bin/bash

# Deploy script to add iot.namisense.com to existing Nginx config on server

set -e

SERVER_IP="${SERVER_IP:-152.42.239.238}"
SERVER_USER="${SERVER_USER:-root}"
PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"

echo "🚀 Deploying iot.namisense.com Nginx configuration to server..."
echo "   (This will ADD to existing config, not override other services)"
echo ""

# Check if sshpass is available
if command -v sshpass > /dev/null 2>&1; then
    SSH_CMD="sshpass -p 'dThrong290980' ssh -o StrictHostKeyChecking=no"
    SCP_CMD="sshpass -p 'dThrong290980' scp -o StrictHostKeyChecking=no"
else
    SSH_CMD="ssh -o StrictHostKeyChecking=no"
    SCP_CMD="scp -o StrictHostKeyChecking=no"
    echo "⚠️  sshpass not found. You may need to enter password manually."
fi

# Ensure project directory exists and pull latest
echo "📥 Pulling latest code on server..."
$SSH_CMD "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && git pull origin main" || {
    echo "⚠️  Git pull failed, but continuing..."
}

# Copy script to server
echo "📤 Copying script to server..."
$SCP_CMD scripts/add-iot-namisense-to-nginx.sh "$SERVER_USER@$SERVER_IP:$PROJECT_DIR/scripts/" || {
    echo "❌ Failed to copy script"
    exit 1
}

# Run the script on server
echo "🔧 Running configuration script on server..."
$SSH_CMD "$SERVER_USER@$SERVER_IP" "chmod +x $PROJECT_DIR/scripts/add-iot-namisense-to-nginx.sh && sudo bash $PROJECT_DIR/scripts/add-iot-namisense-to-nginx.sh" || {
    echo "❌ Failed to run script remotely"
    echo ""
    echo "Please SSH to the server and run manually:"
    echo "  ssh $SERVER_USER@$SERVER_IP"
    echo "  cd $PROJECT_DIR"
    echo "  sudo bash scripts/add-iot-namisense-to-nginx.sh"
    exit 1
}

echo ""
echo "✅ Configuration deployed successfully!"
echo ""
echo "🧪 Test the site:"
echo "  curl -I http://iot.namisense.com"
echo "  curl -I https://iot.namisense.com"
echo "  curl https://iot.namisense.com/health"

