#!/bin/bash

# Automated Remote Service Restart Script
# Uses sshpass for password authentication

set -e

SERVER_IP="152.42.239.238"
SERVER_USER="root"
SERVER_PASSWORD="dThrong290980"

echo "🔄 Restarting Services on Remote Server"
echo "========================================"
echo "Server: $SERVER_USER@$SERVER_IP"
echo ""

# Check if sshpass is available
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass is not installed. Installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass
    else
        echo "Please install sshpass: sudo apt-get install sshpass"
        exit 1
    fi
fi

# Upload the restart script
echo "📤 Uploading restart script to server..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no scripts/restart-services.sh $SERVER_USER@$SERVER_IP:/root/restart-services.sh

# Make it executable and run it
echo ""
echo "🚀 Running restart script on server..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
chmod +x /root/restart-services.sh
cd /root/IOT_web3 2>/dev/null || cd /root/IOT_web3
/root/restart-services.sh
ENDSSH

echo ""
echo "✅ Remote restart complete!"
echo ""
echo "Verifying services..."
sleep 3

# Quick verification
echo ""
echo "🏥 Service Status:"
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "cd /root/IOT_web3 2>/dev/null && docker-compose ps 2>/dev/null || echo 'Docker compose not found in expected location'"

echo ""
echo "✅ All done! Services should be running."
echo ""
echo "You can verify by visiting:"
echo "  Frontend: http://$SERVER_IP:3000"
echo "  Backend:  http://$SERVER_IP:3001/health"
echo ""

