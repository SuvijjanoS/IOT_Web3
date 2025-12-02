#!/bin/bash

# Combined script: Restart services and fix nginx
# This uploads both scripts and runs them on the server

set -e

SERVER_IP="152.42.239.238"
SERVER_USER="root"
SERVER_PASSWORD="dThrong290980"

echo "🔄 Restarting Services and Fixing Nginx"
echo "========================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Upload the updated restart script and nginx config
echo "📤 Uploading scripts to server..."

sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
    "$SCRIPT_DIR/restart-services.sh" \
    "$PROJECT_DIR/nginx-web3iot.conf" \
    $SERVER_USER@$SERVER_IP:/root/

# Run the restart script on the server
echo ""
echo "🚀 Running restart script on server..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /root/IOT_web3
chmod +x /root/restart-services.sh
/root/restart-services.sh
ENDSSH

echo ""
echo "✅ All done!"
echo ""
echo "web3iot.dhammada.com should now be properly configured."
echo "Visit: http://web3iot.dhammada.com"
echo ""

