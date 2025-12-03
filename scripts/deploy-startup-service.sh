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
# Assuming the project is at /opt/IOT_Web3 or current directory
if [ ! -d "/opt/IOT_Web3" ]; then
    echo "Warning: /opt/IOT_Web3 not found. Updating service file to use current directory."
    sed -i "s|/opt/IOT_Web3|$PROJECT_DIR|g" "$SYSTEMD_DIR/iot-web3.service"
fi

# Make startup script executable
chmod +x "$PROJECT_DIR/scripts/startup-iot-web3.sh"

# Create log directory
mkdir -p /var/log
touch /var/log/iot-web3-startup.log
chmod 644 /var/log/iot-web3-startup.log

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable iot-web3.service

echo "Service installed successfully!"
echo ""
echo "To start the service now, run:"
echo "  sudo systemctl start iot-web3.service"
echo ""
echo "To check status:"
echo "  sudo systemctl status iot-web3.service"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u iot-web3.service -f"
echo "  or"
echo "  tail -f /var/log/iot-web3-startup.log"

