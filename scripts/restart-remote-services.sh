#!/bin/bash

# Remote Service Restart Script
# Run this from your local machine to restart services on the server

set -e

SERVER_IP="152.42.239.238"
SERVER_USER="root"

echo "🔄 Restarting Services on Remote Server"
echo "========================================"
echo "Server: $SERVER_USER@$SERVER_IP"
echo ""

# Check if restart-services.sh exists locally
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_RESTART_SCRIPT="$SCRIPT_DIR/restart-services.sh"

if [ ! -f "$LOCAL_RESTART_SCRIPT" ]; then
    echo "❌ restart-services.sh not found locally"
    exit 1
fi

# Upload the restart script to the server
echo "📤 Uploading restart script to server..."
scp "$LOCAL_RESTART_SCRIPT" $SERVER_USER@$SERVER_IP:/root/restart-services.sh

# Make it executable and run it
echo ""
echo "🚀 Running restart script on server..."
ssh $SERVER_USER@$SERVER_IP "chmod +x /root/restart-services.sh && /root/restart-services.sh"

echo ""
echo "✅ Remote restart complete!"
echo ""
echo "You can verify services are running by visiting:"
echo "  Frontend: http://$SERVER_IP:3000"
echo "  Backend:  http://$SERVER_IP:3001/health"
echo ""
echo "To check logs, SSH into the server and run:"
echo "  ssh $SERVER_USER@$SERVER_IP"
echo "  cd /root/IOT_web3"
echo "  docker-compose logs -f"
echo ""

