# Quick Deployment Checklist

## ✅ Completed

1. **Bugs Fixed**: Both bugs verified and fixed on server
   - ✅ `recordReadingOnChain` uses `waterQualityContract` correctly
   - ✅ `publishControlCommand` returns Promise with proper error handling

2. **Code Deployed**: All new architecture code pushed to server
   - ✅ DeviceRegistry and LogToken contracts
   - ✅ Backend services and API endpoints
   - ✅ Database schema updated
   - ✅ Docker-compose updated with new env vars

## ⏳ Remaining Steps

### Step 1: Fund Wallet (CRITICAL - DO THIS FIRST)

**Wallet**: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`

Get Sepolia ETH:
- https://sepoliafaucet.com/
- https://sepoliafaucet.infura.io/

**Need**: ~0.01 ETH

### Step 2: Deploy Contracts

Once wallet has ETH, run locally:

```bash
cd /Users/ss/IOT_Web3/contracts

# Deploy DeviceRegistry
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy-device-registry.js --network sepolia

# Deploy LogToken
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy-log-token.js --network sepolia
```

**Save the contract addresses!**

### Step 3: Update Server .env

SSH to server and edit `/root/IOT_web3/.env`:

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
nano .env
```

Add:
```bash
DEVICE_REGISTRY_ADDRESS=0x...  # From Step 2
LOG_TOKEN_CONTRACT_ADDRESS=0x...  # From Step 2
COMMAND_CENTER_WALLET=0x23e224b79344d96fc00Ce7BdE1D5552d720a027b
```

### Step 4: Run Database Migration

```bash
cd /root/IOT_web3
docker-compose exec backend node src/db/migrate.js
```

### Step 5: Restart Backend

```bash
docker-compose restart backend
docker-compose logs -f backend
```

Look for:
- ✅ "Device Registry Contract initialized"
- ✅ "Log Token Contract initialized"

## Quick Status Check

```bash
# Check wallet balance
cd /Users/ss/IOT_Web3/contracts
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g'); const wallet = new ethers.Wallet('0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c', provider); provider.getBalance(wallet.address).then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

## Current Status

- ✅ Code ready
- ✅ Server updated
- ⏳ Waiting for Sepolia ETH
- ⏳ Contracts need deployment
- ⏳ Database migration pending
- ⏳ Final configuration pending

