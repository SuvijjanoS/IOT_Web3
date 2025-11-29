#!/bin/bash

# Deploy All Contracts to Sepolia Testnet
# This script deploys DeviceRegistry and LogToken contracts

set -e

echo "🚀 Deploying Smart Contracts to Sepolia Testnet"
echo "================================================"
echo ""

# Configuration
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g"
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c"
WALLET_ADDRESS="0x23e224b79344d96fc00Ce7BdE1D5552d720a027b"

cd contracts

echo "📊 Checking wallet balance..."
export SEPOLIA_RPC_URL
export PRIVATE_KEY

# Check balance
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
  echo "Get Sepolia ETH at:"
  echo "  - https://sepoliafaucet.com/"
  echo "  - https://sepoliafaucet.infura.io/"
  echo "  - https://www.alchemy.com/faucets/ethereum-sepolia"
  exit 1
fi

echo "✅ Wallet balance: $BALANCE ETH"
echo ""

echo "🔨 Compiling contracts..."
npx hardhat compile

echo ""
echo "🚀 Deploying DeviceRegistry contract..."
DEVICE_OUTPUT=$(SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" PRIVATE_KEY="$PRIVATE_KEY" npx hardhat run scripts/deploy-device-registry.js --network sepolia 2>&1)
DEVICE_CONTRACT=$(echo "$DEVICE_OUTPUT" | grep "deployed to:" | awk '{print $NF}')

if [ -z "$DEVICE_CONTRACT" ]; then
  echo "❌ Failed to deploy DeviceRegistry"
  echo "$DEVICE_OUTPUT"
  exit 1
fi

echo "✅ DeviceRegistry deployed to: $DEVICE_CONTRACT"
echo ""

echo "🚀 Deploying LogToken contract..."
LOG_OUTPUT=$(SEPOLIA_RPC_URL="$SEPOLIA_RPC_URL" PRIVATE_KEY="$PRIVATE_KEY" npx hardhat run scripts/deploy-log-token.js --network sepolia 2>&1)
LOG_CONTRACT=$(echo "$LOG_OUTPUT" | grep "deployed to:" | awk '{print $NF}')

if [ -z "$LOG_CONTRACT" ]; then
  echo "❌ Failed to deploy LogToken"
  echo "$LOG_OUTPUT"
  exit 1
fi

echo "✅ LogToken deployed to: $LOG_CONTRACT"
echo ""

echo "📝 Contract Addresses:"
echo "======================"
echo "DEVICE_REGISTRY_ADDRESS=$DEVICE_CONTRACT"
echo "LOG_TOKEN_CONTRACT_ADDRESS=$LOG_CONTRACT"
echo "COMMAND_CENTER_WALLET=$WALLET_ADDRESS"
echo ""

# Save to file
cat > ../CONTRACT_ADDRESSES.txt << EOF
# Contract Addresses - Sepolia Testnet
# Generated: $(date)

DEVICE_REGISTRY_ADDRESS=$DEVICE_CONTRACT
LOG_TOKEN_CONTRACT_ADDRESS=$LOG_CONTRACT
COMMAND_CENTER_WALLET=$WALLET_ADDRESS
SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL
PRIVATE_KEY=$PRIVATE_KEY
EOF

echo "✅ Contract addresses saved to CONTRACT_ADDRESSES.txt"
echo ""
echo "🔗 View on Etherscan:"
echo "  DeviceRegistry: https://sepolia.etherscan.io/address/$DEVICE_CONTRACT"
echo "  LogToken: https://sepolia.etherscan.io/address/$LOG_CONTRACT"
echo ""
echo "📋 Next steps:"
echo "1. Update /root/IOT_web3/.env on server with these addresses"
echo "2. Restart backend: docker-compose restart backend"
echo "3. Register 3 test devices using POST /api/devices"

