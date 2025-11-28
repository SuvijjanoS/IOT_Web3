# 🚀 Deploy Contracts Now

## Current Status

✅ **Backend configured** with:
- Sepolia RPC URL: `https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g`
- Private Key: `0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c`
- Wallet Address: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`

⏳ **Waiting for**: Sepolia ETH in wallet to deploy contracts

## Step 1: Fund the Wallet

**Get Sepolia ETH** (need ~0.01 ETH):
1. Visit: https://sepoliafaucet.com/
2. Enter: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`
3. Request testnet ETH
4. Wait 1-2 minutes for confirmation

## Step 2: Deploy Contracts

Once wallet has ETH, run on your local machine:

```bash
cd /Users/ss/IOT_Web3
./deploy-contracts.sh
```

This will:
1. ✅ Check wallet balance
2. ✅ Deploy WaterQualityRegistry contract
3. ✅ Deploy DroneFlightRegistry contract
4. ✅ Update backend/.env with contract addresses
5. ✅ Restart backend automatically

## Step 3: Verify

After deployment:
1. Check backend logs: `docker logs iot_web3_backend | grep blockchain`
2. Submit a test sensor reading
3. Check dashboard - should show transaction hash instead of "Pending"

## Manual Deployment (Alternative)

If the script doesn't work, deploy manually:

```bash
cd contracts

# Deploy Water Quality Contract
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy.js --network sepolia

# Copy the contract address, then deploy Drone Flight Contract
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy-drone.js --network sepolia

# Then update backend/.env on server with contract addresses
```

## Quick Check

Check if wallet has ETH:
```bash
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g'); provider.getBalance('0x23e224b79344d96fc00Ce7BdE1D5552d720a027b').then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

Once balance > 0, you can deploy!

