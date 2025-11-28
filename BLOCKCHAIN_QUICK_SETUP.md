# Quick Blockchain Setup

## Generated Wallet

I've generated a wallet for deployment:
- **Address**: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`
- **Private Key**: `0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c`

## Step 1: Fund the Wallet

**Get Sepolia ETH** (you need ~0.01 ETH for deployment):
1. Visit: https://sepoliafaucet.com/
2. Enter address: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`
3. Request testnet ETH

**Or use other faucets:**
- https://sepoliafaucet.infura.io/
- https://www.alchemy.com/faucets/ethereum-sepolia

## Step 2: Deploy Contracts

Once the wallet has ETH, run:

```bash
cd contracts

# Deploy Water Quality Contract
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy.js --network sepolia

# Deploy Drone Flight Contract  
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy-drone.js --network sepolia
```

## Step 3: Configure Backend

After deployment, add to `backend/.env` on server:

```bash
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g
PRIVATE_KEY=0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c
CONTRACT_ADDRESS=0x...  # From deployment
DRONE_FLIGHT_CONTRACT_ADDRESS=0x...  # From deployment
```

## Step 4: Restart Backend

```bash
docker-compose restart backend
```

## Alternative: Use Your Own Wallet

If you prefer to use your own wallet:
1. Export private key from MetaMask or your wallet
2. Ensure it has Sepolia ETH
3. Use that private key instead

