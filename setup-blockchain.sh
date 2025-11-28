#!/bin/bash

# Blockchain Setup Script
# This script helps set up blockchain configuration

set -e

echo "🔗 Blockchain Setup for IoT Web3 Platform"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f "contracts/.env" ]; then
    echo "Creating contracts/.env file..."
    cat > contracts/.env << EOF
# Sepolia Testnet Configuration
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
EOF
    echo "✅ Created contracts/.env"
    echo ""
    echo "⚠️  Please edit contracts/.env and add your PRIVATE_KEY"
    echo "   The wallet must have Sepolia testnet ETH"
    echo ""
    read -p "Press Enter after you've added your private key..."
fi

# Load environment variables
source contracts/.env

# Check if private key is set
if [ "$PRIVATE_KEY" == "0xYOUR_PRIVATE_KEY_HERE" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY not set in contracts/.env"
    echo ""
    echo "To get a private key:"
    echo "1. Use MetaMask: Account Details → Show Private Key"
    echo "2. Or generate new: node -e \"const {ethers} = require('ethers'); console.log(ethers.Wallet.createRandom().privateKey)\""
    exit 1
fi

# Check if RPC URL is set
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "Using default Sepolia RPC: https://rpc.sepolia.org"
    export SEPOLIA_RPC_URL="https://rpc.sepolia.org"
fi

echo "📦 Installing dependencies..."
cd contracts
npm install

echo ""
echo "🔨 Compiling contracts..."
npx hardhat compile

echo ""
echo "🚀 Deploying WaterQualityRegistry contract..."
WATER_CONTRACT=$(npx hardhat run scripts/deploy.js --network sepolia 2>&1 | grep "deployed to:" | awk '{print $NF}')
echo "Water Quality Contract: $WATER_CONTRACT"

echo ""
echo "🚀 Deploying DroneFlightRegistry contract..."
DRONE_CONTRACT=$(npx hardhat run scripts/deploy-drone.js --network sepolia 2>&1 | grep "deployed to:" | awk '{print $NF}')
echo "Drone Flight Contract: $DRONE_CONTRACT"

echo ""
echo "✅ Contracts deployed!"
echo ""
echo "📝 Add these to your backend/.env file:"
echo "SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL"
echo "PRIVATE_KEY=$PRIVATE_KEY"
echo "CONTRACT_ADDRESS=$WATER_CONTRACT"
echo "DRONE_FLIGHT_CONTRACT_ADDRESS=$DRONE_CONTRACT"
echo ""
echo "Then restart the backend: docker-compose restart backend"

