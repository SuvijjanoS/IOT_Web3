#!/bin/bash

# Register 3 Test IoT Devices
# Run this after contracts are deployed and backend is configured

set -e

API_URL="${API_URL:-http://web3iot.dhammada.com/api}"

echo "📱 Registering 3 Test IoT Devices"
echo "=================================="
echo ""

# Device 1: Water Quality Sensor
echo "1️⃣ Registering Water Quality Sensor..."
DEVICE1=$(curl -s -X POST "$API_URL/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "IoT Solutions Inc",
    "model": "WQ-2024",
    "serial_number": "WQ001234",
    "hardware_nonce": "HW001"
  }')

DEVICE1_ID=$(echo "$DEVICE1" | grep -o '"deviceId":"[^"]*' | cut -d'"' -f4)
echo "✅ Device 1 registered: $DEVICE1_ID"
echo "   Wallet: $(echo "$DEVICE1" | grep -o '"deviceWallet":"[^"]*' | cut -d'"' -f4)"
echo ""

# Device 2: Temperature Sensor
echo "2️⃣ Registering Temperature Sensor..."
DEVICE2=$(curl -s -X POST "$API_URL/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "IoT Solutions Inc",
    "model": "TEMP-2024",
    "serial_number": "TEMP005678",
    "hardware_nonce": "HW002"
  }')

DEVICE2_ID=$(echo "$DEVICE2" | grep -o '"deviceId":"[^"]*' | cut -d'"' -f4)
echo "✅ Device 2 registered: $DEVICE2_ID"
echo "   Wallet: $(echo "$DEVICE2" | grep -o '"deviceWallet":"[^"]*' | cut -d'"' -f4)"
echo ""

# Device 3: Drone
echo "3️⃣ Registering Drone..."
DEVICE3=$(curl -s -X POST "$API_URL/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "DJI",
    "model": "Mavic 3",
    "serial_number": "DJI-M3-999",
    "hardware_nonce": "HW003"
  }')

DEVICE3_ID=$(echo "$DEVICE3" | grep -o '"deviceId":"[^"]*' | cut -d'"' -f4)
echo "✅ Device 3 registered: $DEVICE3_ID"
echo "   Wallet: $(echo "$DEVICE3" | grep -o '"deviceWallet":"[^"]*' | cut -d'"' -f4)"
echo ""

echo "📋 Summary:"
echo "==========="
echo "Device 1 (Water Quality): $DEVICE1_ID"
echo "Device 2 (Temperature):   $DEVICE2_ID"
echo "Device 3 (Drone):         $DEVICE3_ID"
echo ""
echo "✅ All 3 devices registered successfully!"
echo ""
echo "Test by submitting logs:"
echo "  curl -X POST $API_URL/device-logs -H 'Content-Type: application/json' -d '{\"device_id\":\"$DEVICE1_ID\",\"log_entries\":[...]}'"

