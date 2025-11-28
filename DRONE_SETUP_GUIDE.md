# Drone Flight Logs - Setup Guide

## Quick Start

### 1. Deploy Smart Contract

```bash
cd contracts
npx hardhat run scripts/deploy-drone.js --network sepolia
```

Copy the contract address and add to your `.env`:
```
DRONE_FLIGHT_CONTRACT_ADDRESS=0x...
```

### 2. Run Database Migration

```bash
cd backend
node src/db/migrate.js
```

This creates the `drone_flights` and `drone_flight_samples` tables.

### 3. Update Environment Variables

Add to `backend/.env`:
```
DRONE_FLIGHT_CONTRACT_ADDRESS=0x...  # From step 1
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x...  # Your wallet private key
```

### 4. Restart Backend

```bash
docker-compose restart backend
# Or if running locally:
cd backend && npm start
```

### 5. Test with Simulator

```bash
cd drone-simulator
npm install
npm start
```

### 6. View Dashboard

Visit: https://web3iot.dhammada.com/drones

## Viewing Tokens on EVM Testnet

### Via Dashboard

1. Go to `/drones` page
2. Click on any flight card
3. If tokenized, click "View Transaction" link
4. Opens Etherscan showing:
   - Transaction hash
   - Block number
   - Gas used
   - Contract interaction details

### Via Etherscan Directly

1. Get transaction hash from:
   - Database: `SELECT tx_hash FROM drone_flights WHERE flight_id = '...'`
   - Dashboard: Click flight card → see transaction link
2. Visit: `https://sepolia.etherscan.io/tx/{tx_hash}`
3. View full transaction details

### Query Contract

```javascript
// Using ethers.js in browser console or Node.js
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');
const contractAddress = '0x...'; // Your deployed contract address

const abi = [
  "function getFlight(string calldata flightId, string calldata droneId, uint256 startedAt) external view returns (bytes32 logHash, uint256 startedAt, string memory flightId, string memory droneId, string memory droneModel, address recorder, uint256 samplesCount, uint256 durationS)"
];

const contract = new ethers.Contract(contractAddress, abi, provider);

// Get flight details
const flight = await contract.getFlight(
  'FLIGHT_123',
  'MAVIC3_001',
  1701158400  // Unix timestamp
);

console.log('Log Hash:', flight.logHash);
console.log('Recorder:', flight.recorder);
console.log('Samples:', flight.samplesCount.toString());
```

## API Usage

### Submit a Flight Log

```bash
curl -X POST https://web3iot.dhammada.com/api/v1/drone-logs \
  -H "Content-Type: application/json" \
  -d @flight-log.json
```

See `DRONE_FLIGHTS.md` for complete JSON schema.

### Get All Flights

```bash
curl https://web3iot.dhammada.com/api/drone-flights
```

### Get Specific Flight

```bash
curl https://web3iot.dhammada.com/api/drone-flights/FLIGHT_123
```

## Verification Process

1. **Submit Flight**: POST flight log to API
2. **Hash Computed**: Backend computes SHA-256 hash
3. **Stored**: Flight data saved to database
4. **Tokenized**: Hash recorded on Ethereum Sepolia
5. **Verify**: 
   - Download original flight log
   - Re-compute SHA-256 hash
   - Compare with on-chain hash

## Troubleshooting

### Contract Not Deployed

- Ensure you have Sepolia ETH for gas
- Check `hardhat.config.js` network settings
- Verify private key has funds

### Database Errors

- Run migration: `node backend/src/db/migrate.js`
- Check PostgreSQL is running
- Verify connection in `.env`

### Frontend Not Showing Flights

- Check browser console for errors
- Verify API endpoint is accessible
- Check CORS settings if needed

### Blockchain Not Recording

- Check `DRONE_FLIGHT_CONTRACT_ADDRESS` in `.env`
- Verify Sepolia RPC URL is accessible
- Check backend logs for errors
- Ensure private key has ETH for gas

## Next Steps

- Deploy contract to mainnet (when ready)
- Add more drone models
- Implement flight analytics
- Add MQTT real-time ingestion
- Create flight log export feature

