#!/bin/bash
#
# Deploy the startup service to the server
# This script should be run on the server to install the systemd service
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_FILE="$SCRIPT_DIR/iot-web3.service"
SYSTEMD_DIR="/etc/systemd/system"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

echo "Deploying IOT Web3 startup service..."

# Copy service file
cp "$SERVICE_FILE" "$SYSTEMD_DIR/iot-web3.service"

# Update the path in the service file if needed
# Check common locations: /root/IOT_Web3, /opt/IOT_Web3, or current directory
if [ -d "/root/IOT_Web3" ]; then
    PROJECT_DIR="/root/IOT_Web3"
    echo "Using project directory: $PROJECT_DIR"
    sed -i "s|/root/IOT_Web3|$PROJECT_DIR|g" "$SYSTEMD_DIR/iot-web3.service" || true
elif [ -d "/opt/IOT_Web3" ]; then
    PROJECT_DIR="/opt/IOT_Web3"
    echo "Using project directory: $PROJECT_DIR"
    sed -i "s|/root/IOT_Web3|$PROJECT_DIR|g" "$SYSTEMD_DIR/iot-web3.service" || true
else
    echo "Warning: Standard locations not found. Using current directory: $PROJECT_DIR"
    sed -i "s|/root/IOT_Web3|$PROJECT_DIR|g" "$SYSTEMD_DIR/iot-web3.service" || true
fi

# Make startup script executable
chmod +x "$PROJECT_DIR/scripts/startup-iot-web3.sh"

# Create log directory
mkdir -p /var/log
touch /var/log/iot-web3-startup.log
chmod 644 /var/log/iot-web3-startup.log

# Reload systemd
systemctl daemon-reload

# Enable service to start on boot
systemctl enable iot-web3.service

# Also ensure Nginx is enabled to start on boot
if command -v nginx > /dev/null 2>&1; then
    systemctl enable nginx || echo "Warning: Could not enable Nginx service"
fi

# Ensure Docker is enabled to start on boot
systemctl enable docker || echo "Warning: Could not enable Docker service"

echo ""
echo "✅ Service installed successfully!"
echo ""
echo "📋 Service Configuration:"
echo "  - Service file: $SYSTEMD_DIR/iot-web3.service"
echo "  - Startup script: $PROJECT_DIR/scripts/startup-iot-web3.sh"
echo "  - Log file: /var/log/iot-web3-startup.log"
echo ""
echo "🚀 To start the service now, run:"
echo "  sudo systemctl start iot-web3.service"
echo ""
echo "📊 To check status:"
echo "  sudo systemctl status iot-web3.service"
echo ""
echo "📝 To view logs:"
echo "  sudo journalctl -u iot-web3.service -f"
echo "  or"
echo "  tail -f /var/log/iot-web3-startup.log"
echo ""
echo "🔄 The service will automatically start on system boot"
echo "   All Docker containers have 'restart: unless-stopped' policy"
echo "   Nginx service is enabled to start on boot"

