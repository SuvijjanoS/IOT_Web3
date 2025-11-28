#!/bin/bash

# Contract Deployment Script
# Run this after funding the wallet with Sepolia ETH

set -e

echo "🚀 Deploying Smart Contracts to Sepolia"
echo "========================================="
echo ""

# Configuration
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g"
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c"
WALLET_ADDRESS="0x23e224b79344d96fc00Ce7BdE1D5552d720a027b"

cd contracts

echo "📦 Checking wallet balance..."
export SEPOLIA_RPC_URL
export PRIVATE_KEY

# Check balance using node
BALANCE=$(node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
provider.getBalance(wallet.address).then(b => {
  const eth = parseFloat(ethers.formatEther(b));
  console.log(eth);
  if (eth < 0.001) {
    console.error('Insufficient balance. Need at least 0.001 ETH');
    process.exit(1);
  }
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
" 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Error checking balance or insufficient funds"
  echo ""
  echo "Please fund the wallet: $WALLET_ADDRESS"
  echo "Get Sepolia ETH at: https://sepoliafaucet.com/"
  exit 1
fi

echo "✅ Wallet balance: $BALANCE ETH"
echo ""

echo "🔨 Compiling contracts..."
npx hardhat compile

echo ""
echo "🚀 Deploying WaterQualityRegistry..."
WATER_OUTPUT=$(SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" PRIVATE_KEY="$PRIVATE_KEY" npx hardhat run scripts/deploy.js --network sepolia 2>&1)
WATER_CONTRACT=$(echo "$WATER_OUTPUT" | grep "deployed to:" | awk '{print $NF}')

if [ -z "$WATER_CONTRACT" ]; then
  echo "❌ Failed to deploy WaterQualityRegistry"
  echo "$WATER_OUTPUT"
  exit 1
fi

echo "✅ WaterQualityRegistry deployed to: $WATER_CONTRACT"
echo ""

echo "🚀 Deploying DroneFlightRegistry..."
DRONE_OUTPUT=$(SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" PRIVATE_KEY="$PRIVATE_KEY" npx hardhat run scripts/deploy-drone.js --network sepolia 2>&1)
DRONE_CONTRACT=$(echo "$DRONE_OUTPUT" | grep "deployed to:" | awk '{print $NF}')

if [ -z "$DRONE_CONTRACT" ]; then
  echo "❌ Failed to deploy DroneFlightRegistry"
  echo "$DRONE_OUTPUT"
  exit 1
fi

echo "✅ DroneFlightRegistry deployed to: $DRONE_CONTRACT"
echo ""

echo "📝 Updating backend/.env..."
cd ../backend

# Update or add contract addresses
if grep -q "CONTRACT_ADDRESS=" .env 2>/dev/null; then
  sed -i "s|^CONTRACT_ADDRESS=.*|CONTRACT_ADDRESS=$WATER_CONTRACT|" .env
else
  echo "CONTRACT_ADDRESS=$WATER_CONTRACT" >> .env
fi

if grep -q "DRONE_FLIGHT_CONTRACT_ADDRESS=" .env 2>/dev/null; then
  sed -i "s|^DRONE_FLIGHT_CONTRACT_ADDRESS=.*|DRONE_FLIGHT_CONTRACT_ADDRESS=$DRONE_CONTRACT|" .env
else
  echo "DRONE_FLIGHT_CONTRACT_ADDRESS=$DRONE_CONTRACT" >> .env
fi

echo "✅ Backend .env updated"
echo ""
echo "📋 Contract Addresses:"
echo "Water Quality: $WATER_CONTRACT"
echo "Drone Flight:  $DRONE_CONTRACT"
echo ""
echo "🔄 Restarting backend..."
cd ..
docker-compose restart backend

echo ""
echo "✅ Blockchain configuration complete!"
echo ""
echo "Test by submitting a sensor reading and check the dashboard for blockchain links."

