# Getting Sepolia Testnet ETH

## Current Situation

The Sepolia faucet requires your mainnet wallet to have at least **0.001 ETH** to prevent abuse.

## Steps to Get Sepolia ETH

### Step 1: Verify Mainnet Balance

Check if your mainnet wallet has at least 0.001 ETH:
```bash
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com'); provider.getBalance('0x23e224b79344d96fc00Ce7BdE1D5552d720a027b').then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

### Step 2: Wait for ChangeHero Transaction

If balance is still 0, wait for the ChangeHero transaction to complete:
- **Transaction ID**: `k7ul2p24dijtdac6l7`
- Check status on: https://changehero.io/ or Etherscan

### Step 3: Request Sepolia ETH from Faucet

Once you have ≥0.001 ETH on mainnet:

1. **Sepolia Faucet** (Recommended):
   - Visit: https://sepoliafaucet.com/
   - Enter address: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`
   - Complete verification (if required)
   - Request Sepolia ETH

2. **QuickNode Faucet**:
   - Visit: https://faucet.quicknode.com/ethereum/sepolia
   - Connect wallet or enter address
   - Request testnet ETH

3. **Alchemy Faucet**:
   - Visit: https://www.alchemy.com/faucets/ethereum/sepolia
   - Sign in with Alchemy account
   - Request Sepolia ETH

### Step 4: Verify Sepolia Balance

After requesting, wait 1-2 minutes, then check:
```bash
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g'); provider.getBalance('0x23e224b79344d96fc00Ce7BdE1D5552d720a027b').then(b => console.log('Sepolia Balance:', ethers.formatEther(b), 'ETH'));"
```

### Step 5: Deploy Contracts

Once you have Sepolia ETH (≥0.01 ETH recommended):
```bash
./deploy-all-contracts.sh
```

## Alternative: Direct Sepolia Exchange

If faucets don't work, you can:
1. Use a DEX that supports Sepolia testnet
2. Bridge from another testnet
3. Ask in Ethereum Discord/Telegram for testnet ETH

## Security Reminder

⚠️ **Remember**: The private key for this wallet is exposed in the repository.  
⚠️ **Do NOT** keep real mainnet funds in this wallet long-term.  
✅ Transfer mainnet ETH to a secure wallet after getting Sepolia ETH.

