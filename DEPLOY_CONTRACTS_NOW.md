# Deploy Contracts to Sepolia - Step by Step

## Current Status

- ✅ **Wallet**: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`
- ⏳ **Balance**: 0.0 ETH (needs funding)
- ✅ **Scripts Ready**: Deployment scripts created

## Step 1: Fund the Wallet

**Wallet Address**: `0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`

Get Sepolia ETH from:
1. **https://sepoliafaucet.com/** (recommended)
2. **https://sepoliafaucet.infura.io/**
3. **https://www.alchemy.com/faucets/ethereum-sepolia**

**Need**: ~0.01 ETH (enough for 2 contract deployments)

**Check balance**:
```bash
cd /Users/ss/IOT_Web3/contracts
node -e "const { ethers } = require('ethers'); const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g'); const wallet = new ethers.Wallet('0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c', provider); provider.getBalance(wallet.address).then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

## Step 2: Deploy Contracts

Once wallet has ETH (≥0.001 ETH), run:

```bash
cd /Users/ss/IOT_Web3
./deploy-all-contracts.sh
```

This will:
1. ✅ Check wallet balance
2. ✅ Compile contracts
3. ✅ Deploy DeviceRegistry contract
4. ✅ Deploy LogToken contract
5. ✅ Save addresses to CONTRACT_ADDRESSES.txt

**Expected output**:
```
✅ DeviceRegistry deployed to: 0x...
✅ LogToken deployed to: 0x...
```

## Step 3: Configure Backend

SSH to server and update environment:

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
nano .env
```

Add these lines (use addresses from CONTRACT_ADDRESSES.txt):
```bash
DEVICE_REGISTRY_ADDRESS=0x...  # From deployment
LOG_TOKEN_CONTRACT_ADDRESS=0x...  # From deployment
COMMAND_CENTER_WALLET=0x23e224b79344d96fc00Ce7BdE1D5552d720a027b
```

## Step 4: Restart Backend

```bash
cd /root/IOT_web3
docker-compose restart backend
docker-compose logs -f backend
```

Look for:
- ✅ "Device Registry Contract initialized. Address: 0x..."
- ✅ "Log Token Contract initialized. Address: 0x..."

## Step 5: Register 3 Test Devices

Run the registration script:

```bash
cd /Users/ss/IOT_Web3
./register-test-devices.sh
```

Or manually register:

```bash
# Device 1: Water Quality Sensor
curl -X POST https://web3iot.dhammada.com/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "IoT Solutions Inc",
    "model": "WQ-2024",
    "serial_number": "WQ001234",
    "hardware_nonce": "HW001"
  }'

# Device 2: Temperature Sensor
curl -X POST https://web3iot.dhammada.com/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "IoT Solutions Inc",
    "model": "TEMP-2024",
    "serial_number": "TEMP005678",
    "hardware_nonce": "HW002"
  }'

# Device 3: Drone
curl -X POST https://web3iot.dhammada.com/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "DJI",
    "model": "Mavic 3",
    "serial_number": "DJI-M3-999",
    "hardware_nonce": "HW003"
  }'
```

## Step 6: Test Log Tokenization

Submit a test device log:

```bash
# Get device ID from registration response, then:
curl -X POST https://web3iot.dhammada.com/api/device-logs \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "0x...",
    "log_entries": [
      {"t_ms": 0, "lat": 13.7563, "lon": 100.5018, "height_agl_m": 0.1},
      {"t_ms": 1000, "lat": 13.7564, "lon": 100.5019, "height_agl_m": 5.2}
    ]
  }'
```

## Troubleshooting

### Wallet has no ETH
- Wait 1-2 minutes after requesting from faucet
- Try multiple faucets if one doesn't work
- Check balance again before deploying

### Deployment fails
- Verify RPC URL is correct
- Check private key format (must start with 0x)
- Ensure wallet has enough ETH for gas

### Backend not initializing contracts
- Verify .env file has correct addresses
- Check docker-compose.yml includes new env vars
- Restart backend: `docker-compose restart backend`

## Quick Status Check

```bash
# Check wallet balance
cd /Users/ss/IOT_Web3/contracts
node -e "const {ethers} = require('ethers'); const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g'); const wallet = new ethers.Wallet('0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c', provider); provider.getBalance(wallet.address).then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"

# Check contracts (after deployment)
curl https://sepolia.etherscan.io/api?module=contract&action=getabi&address=DEVICE_REGISTRY_ADDRESS&apikey=YOUR_API_KEY
```

