# Blockchain Configuration Guide

## Current Status: ⚠️ Blockchain Not Configured

Your data is being stored in the database, but **blockchain tokenization is disabled** because the required environment variables are not set.

## Why You See "Pending"

When you see "Pending" or "Blockchain: Pending" status, it means:
- ✅ Data is stored in PostgreSQL database
- ✅ Hash is computed correctly
- ❌ Hash is NOT recorded on Ethereum Sepolia testnet
- ❌ No transaction hash available

## How to Enable Blockchain Tokenization

### Step 1: Get Sepolia Testnet ETH

You need Sepolia ETH to pay for gas fees:
1. Visit: https://sepoliafaucet.com/
2. Enter your wallet address
3. Request testnet ETH (you'll need ~0.1 ETH for testing)

### Step 2: Deploy Smart Contracts

#### Deploy Water Quality Contract

```bash
cd contracts
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the contract address (e.g., `0x1234...`)

#### Deploy Drone Flight Contract

```bash
cd contracts
npx hardhat run scripts/deploy-drone.js --network sepolia
```

Copy the contract address (e.g., `0x5678...`)

### Step 3: Configure Backend Environment

Create or edit `backend/.env` on your server:

```bash
# Sepolia RPC URL (use Infura, Alchemy, or public RPC)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
# Or use public: https://rpc.sepolia.org

# Your wallet private key (with Sepolia ETH)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Water Quality Contract Address
CONTRACT_ADDRESS=0x...  # From Step 2

# Drone Flight Contract Address
DRONE_FLIGHT_CONTRACT_ADDRESS=0x...  # From Step 2
```

### Step 4: Restart Backend

```bash
docker-compose restart backend
```

### Step 5: Verify Configuration

Check backend logs:
```bash
docker logs iot_web3_backend --tail 20
```

You should see:
```
Blockchain initialized. Contract address: 0x...
Drone Flight Contract initialized. Address: 0x...
```

## Testing Blockchain Recording

### Test Water Quality Reading

```bash
curl -X POST https://web3iot.dhammada.com/api/v1/sensor-readings \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "test_sensor",
    "ts": "2025-11-28T10:00:00Z",
    "parameters": {
      "ph": 7.0,
      "temperature_c": 25.0
    },
    "battery_pct": 100,
    "status": "OK"
  }'
```

Check backend logs for:
```
Recorded reading X on-chain: 0x...
```

### Test Drone Flight

```bash
curl -X POST https://web3iot.dhammada.com/api/v1/drone-logs \
  -H "Content-Type: application/json" \
  -d @flight-log.json
```

## Viewing on Etherscan

Once tokenized, you can view transactions:

1. **Get Transaction Hash** from:
   - Dashboard (click reading/flight)
   - Database query: `SELECT tx_hash FROM water_readings WHERE id = X`
   - API response

2. **View on Etherscan**:
   - Visit: `https://sepolia.etherscan.io/tx/{tx_hash}`
   - Or click the blockchain badge in the dashboard

## Troubleshooting

### "Blockchain configuration missing"

- Check `.env` file exists in `backend/` directory
- Verify all required variables are set
- Restart backend: `docker-compose restart backend`

### "Failed to record on blockchain"

- Check you have Sepolia ETH in your wallet
- Verify RPC URL is accessible
- Check contract addresses are correct
- Review backend logs: `docker logs iot_web3_backend`

### "Contract is not defined"

- Contract address not set in `.env`
- Backend not restarted after setting `.env`
- Contract deployment failed

### Transaction Fails

- Insufficient Sepolia ETH for gas
- Invalid contract address
- Network connectivity issues
- Contract function signature mismatch

## Quick Setup Script

For DigitalOcean server:

```bash
# SSH into server
ssh root@152.42.239.238

# Edit backend .env
cd /root/IOT_web3
nano backend/.env

# Add:
SEPOLIA_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
DRONE_FLIGHT_CONTRACT_ADDRESS=0x...

# Restart backend
docker-compose restart backend

# Check logs
docker logs iot_web3_backend --tail 30
```

## Free RPC Providers

- **Public Sepolia RPC**: https://rpc.sepolia.org
- **Infura**: https://infura.io (free tier available)
- **Alchemy**: https://www.alchemy.com (free tier available)

## Security Notes

⚠️ **Never commit `.env` files to Git**
- `.env` files are in `.gitignore`
- Private keys should be kept secure
- Use environment variables in production
- Consider using a secrets manager

## Next Steps

1. Get Sepolia testnet ETH
2. Deploy contracts
3. Configure `.env` file
4. Restart backend
5. Submit test data
6. Verify on Etherscan

Once configured, all new sensor readings and flight logs will be automatically tokenized on-chain! 🎉

