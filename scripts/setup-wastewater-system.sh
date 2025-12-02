#!/bin/bash

# Setup Wastewater Sensor System
# 1. Clean up existing sensors
# 2. Register 9 new sensors
# 3. Generate 3 days of readings

set -e

API_URL="${API_URL:-https://web3iot.dhammada.com/api}"
DB_HOST="${DB_HOST:-152.42.239.238}"
DB_USER="${DB_USER:-root}"

echo "🚀 Setting up Wastewater Sensor System"
echo "======================================="
echo ""

# Step 1: Clean up existing sensors and readings
echo "Step 1: Cleaning up existing data..."
echo "Run this SQL on the database:"
echo ""
echo "DELETE FROM sensor_datapoints;"
echo "DELETE FROM water_readings;"
echo ""
read -p "Press Enter after cleaning up the database..."

# Step 2: Register sensors
echo ""
echo "Step 2: Registering 9 wastewater sensors..."
cd "$(dirname "$0")"
API_URL="$API_URL" node register-wastewater-sensors.js

# Step 3: Generate readings
echo ""
echo "Step 3: Generating 3 days of readings (this may take a while)..."
API_URL="$API_URL" node generate-wastewater-readings.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "Check the Web3 Process tab to see registered sensors."

