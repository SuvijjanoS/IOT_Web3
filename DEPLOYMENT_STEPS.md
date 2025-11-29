# Deployment Steps for New Blockchain Architecture

## Current Status

✅ **Bugs Fixed**: Both bugs verified and fixed on server
- Bug 1: `recordReadingOnChain` uses `waterQualityContract` correctly
- Bug 2: `publishControlCommand` returns Promise with proper error handling

⏳ **Waiting**: Wallet needs Sepolia ETH for contract deployment

## Step 1: Fund Wallet (REQUIRED FIRST)

**Wallet Address**: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`

Get Sepolia ETH from:
- https://sepoliafaucet.com/
- https://sepoliafaucet.infura.io/
- https://www.alchemy.com/faucets/ethereum-sepolia

**Need**: ~0.01 ETH for both contract deployments

## Step 2: Deploy Contracts

Once wallet has ETH, run on your local machine:

```bash
cd /Users/ss/IOT_Web3/contracts

# Deploy DeviceRegistry
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy-device-registry.js --network sepolia

# Copy the contract address, then deploy LogToken
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g" \
PRIVATE_KEY="0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c" \
npx hardhat run scripts/deploy-log-token.js --network sepolia
```

**Save the contract addresses** - you'll need them for Step 3.

## Step 3: Configure Backend Environment

SSH to server and update `/root/IOT_web3/.env`:

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
nano .env
```

Add/update these variables:
```bash
# Existing blockchain config
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g
PRIVATE_KEY=0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c

# New contract addresses (replace with actual addresses from Step 2)
DEVICE_REGISTRY_ADDRESS=0x...
LOG_TOKEN_CONTRACT_ADDRESS=0x...

# Command center wallet (for command logs)
COMMAND_CENTER_WALLET=0x23e224b79344d96fc00Ce7BdE1D5552d720a027b
```

Also update `docker-compose.yml` to include new environment variables (if not already done).

## Step 4: Run Database Migrations

On the server:

```bash
cd /root/IOT_web3
docker-compose exec backend node src/db/migrate.js
```

Or manually run SQL:

```bash
docker-compose exec postgres psql -U postgres -d iot_web3 -f /path/to/schema.sql
```

## Step 5: Restart Backend

```bash
docker-compose restart backend
docker-compose logs -f backend
```

Check logs for:
- ✅ "Device Registry Contract initialized"
- ✅ "Log Token Contract initialized"
- ✅ No blockchain errors

## Step 6: Verify Deployment

### Test Device Registration

```bash
curl -X POST http://web3iot.dhammada.com/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "DJI",
    "model": "Mavic 3",
    "serial_number": "SN123456",
    "hardware_nonce": "HW789"
  }'
```

### Test Log Tokenization

```bash
curl -X POST http://web3iot.dhammada.com/api/device-logs \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "0x...",
    "log_entries": [
      {"t_ms": 0, "lat": 13.7563, "lon": 100.5018, "height_agl_m": 0.1}
    ]
  }'
```

### Test Log Verification

```bash
curl -X POST http://web3iot.dhammada.com/api/verify-log \
  -H "Content-Type: application/json" \
  -d '{
    "log_entries": [...],
    "is_command_log": false
  }'
```

## Troubleshooting

### Contracts not deploying
- Check wallet has ETH: `node -e "const {ethers} = require('ethers'); ..."`
- Verify RPC URL is correct
- Check private key format (should start with 0x)

### Backend not initializing contracts
- Verify environment variables in `.env`
- Check docker-compose.yml includes new env vars
- Check backend logs: `docker logs iot_web3_backend`

### Database errors
- Ensure migrations ran successfully
- Check PostgreSQL is running: `docker-compose ps postgres`
- Verify schema.sql was applied

## Quick Check Script

Run this to verify everything:

```bash
# Check wallet balance
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g'); const wallet = new ethers.Wallet('0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c', provider); provider.getBalance(wallet.address).then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"

# Check contracts deployed (after deployment)
# Replace with actual addresses
curl https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=DEVICE_REGISTRY_ADDRESS&apikey=YOUR_API_KEY
```

