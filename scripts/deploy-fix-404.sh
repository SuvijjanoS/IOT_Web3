#!/bin/bash

# Deploy the 404 fix script to the server and run it remotely

set -e

SERVER_IP="${SERVER_IP:-152.42.239.238}"
SERVER_USER="${SERVER_USER:-root}"
PROJECT_DIR="${PROJECT_DIR:-/root/IOT_Web3}"

echo "🚀 Deploying 404 fix to server..."

# Check if sshpass is available (for password authentication)
if command -v sshpass > /dev/null 2>&1; then
    SSH_CMD="sshpass -p 'dThrong290980' ssh -o StrictHostKeyChecking=no"
else
    SSH_CMD="ssh -o StrictHostKeyChecking=no"
    echo "⚠️  sshpass not found. You may need to enter password manually."
fi

# Copy fix script to server
echo "📤 Copying fix script to server..."
$SSH_CMD "$SERVER_USER@$SERVER_IP" "mkdir -p $PROJECT_DIR/scripts" || exit 1

scp -o StrictHostKeyChecking=no scripts/fix-iot-namisense-404.sh "$SERVER_USER@$SERVER_IP:$PROJECT_DIR/scripts/" || {
    echo "❌ Failed to copy script. Trying with password..."
    if command -v sshpass > /dev/null 2>&1; then
        sshpass -p 'dThrong290980' scp -o StrictHostKeyChecking=no scripts/fix-iot-namisense-404.sh "$SERVER_USER@$SERVER_IP:$PROJECT_DIR/scripts/"
    else
        echo "Please copy scripts/fix-iot-namisense-404.sh to server manually"
        exit 1
    fi
}

# Run the fix script on server
echo "🔧 Running fix script on server..."
$SSH_CMD "$SERVER_USER@$SERVER_IP" "chmod +x $PROJECT_DIR/scripts/fix-iot-namisense-404.sh && bash $PROJECT_DIR/scripts/fix-iot-namisense-404.sh" || {
    echo "❌ Failed to run fix script remotely"
    echo "Please SSH to the server and run manually:"
    echo "  ssh $SERVER_USER@$SERVER_IP"
    echo "  sudo bash $PROJECT_DIR/scripts/fix-iot-namisense-404.sh"
    exit 1
}

echo ""
echo "✅ Fix deployed and executed successfully!"
echo ""
echo "🧪 Test the site:"
echo "  curl http://iot.namisense.com"
echo "  curl http://iot.namisense.com/health"

