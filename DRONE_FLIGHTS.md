# Drone Flight Logs Integration

## Overview

This system supports ingestion and blockchain verification of DJI Mavic 3 flight logs. Flight telemetry data is stored in the database, hashed using SHA-256, and the hash is recorded on the Ethereum Sepolia testnet for tamper-proof verification.

## Features

- ✅ **Flight Log Ingestion**: POST API endpoint to submit DJI Mavic 3 flight logs
- ✅ **Database Storage**: Stores flight metadata and time-series telemetry samples
- ✅ **Blockchain Verification**: SHA-256 hash of flight log recorded on-chain
- ✅ **Dashboard Visualization**: Interactive charts for flight path, altitude, speed, etc.
- ✅ **Etherscan Integration**: View transaction hashes on Sepolia testnet

## API Endpoints

### Submit Flight Log

```bash
POST /api/v1/drone-logs
Content-Type: application/json

{
  "flight_id": "FLIGHT_123",
  "drone_id": "MAVIC3_001",
  "drone_model": "DJI Mavic 3",
  "started_at_utc": "2025-11-28T06:20:00Z",
  "firmware_version": "01.01.1200",
  "app_name": "DJI Fly",
  "app_version": "1.15.0",
  "home_point": {
    "lat": 13.756331,
    "lon": 100.501765,
    "alt_asl_m": 2.5
  },
  "samples_hz": 10,
  "samples": [
    {
      "t_ms": 0,
      "lat": 13.756331,
      "lon": 100.501765,
      "height_agl_m": 0.2,
      "alt_asl_m": 2.7,
      "pitch_deg": 0.0,
      "roll_deg": 0.0,
      "yaw_deg": 0.0,
      "vx_ms": 0.0,
      "vy_ms": 0.0,
      "vz_ms": 0.0,
      "h_speed_ms": 0.0,
      "gps_level": 4,
      "gps_sats": 18,
      "flight_mode": "P-GPS",
      "rc_aileron_pct": 0.0,
      "rc_elevator_pct": 0.0,
      "rc_throttle_pct": 10.0,
      "rc_rudder_pct": 0.0,
      "battery_pct": 99,
      "battery_voltage_v": 15.9,
      "warnings": [],
      "event_flags": {
        "photo_taken": false,
        "video_rec": true,
        "rth_active": false
      }
    }
    // ... more samples
  ]
}
```

### Get All Flights

```bash
GET /api/drone-flights?limit=50&offset=0
```

### Get Flight by ID

```bash
GET /api/drone-flights/:flightId
```

### Get All Drones

```bash
GET /api/drones
```

### Get Flights by Drone ID

```bash
GET /api/drones/:droneId/flights?limit=50
```

## Database Schema

### `drone_flights` Table

Stores flight metadata:
- `flight_id` (unique identifier)
- `drone_id`, `drone_model`
- `started_at_utc`, `duration_s`
- `samples_count`, `max_height_agl_m`, `max_h_speed_ms`
- `log_hash` (SHA-256 hash)
- `tokenization_status`, `tx_hash`, `block_number`

### `drone_flight_samples` Table

Stores time-series telemetry data:
- `flight_id` (foreign key)
- `t_ms` (time in milliseconds)
- GPS: `lat`, `lon`, `height_agl_m`, `alt_asl_m`
- Motion: `pitch_deg`, `roll_deg`, `yaw_deg`
- Velocity: `vx_ms`, `vy_ms`, `vz_ms`, `h_speed_ms`
- GPS status: `gps_level`, `gps_sats`, `flight_mode`
- RC inputs: `rc_aileron_pct`, `rc_elevator_pct`, `rc_throttle_pct`, `rc_rudder_pct`
- Battery: `battery_pct`, `battery_voltage_v`
- Events: `warnings`, `event_flags`

## Smart Contract

### Deploy DroneFlightRegistry Contract

```bash
cd contracts
npx hardhat run scripts/deploy-drone.js --network sepolia
```

Add the contract address to your `.env`:
```
DRONE_FLIGHT_CONTRACT_ADDRESS=0x...
```

### Contract Functions

- `recordFlight(flightId, droneId, droneModel, startedAt, logHash, samplesCount, durationS)`
- `getFlight(flightId, droneId, startedAt)` - Returns flight details
- `getDroneFlights(droneId)` - Returns all flight keys for a drone

## Frontend Dashboard

Access the drone flight dashboard at:
- **URL**: `/drones` or https://web3iot.dhammada.com/drones

Features:
- View all flights or filter by drone
- Click a flight card to see detailed telemetry
- Time-series charts for altitude, speed, battery, etc.
- GPS flight path visualization
- Blockchain transaction links to Etherscan

## Simulator

Test the system with a flight log simulator:

```bash
cd drone-simulator
npm install
npm start
```

Or set custom API URL:
```bash
API_URL=https://web3iot.dhammada.com/api/v1/drone-logs npm start
```

## Viewing Tokens on EVM Testnet

### Method 1: Via Dashboard

1. Go to `/drones` dashboard
2. Click on any flight card
3. If tokenized, click "View Transaction" link
4. Opens Etherscan showing the transaction

### Method 2: Via Etherscan Directly

1. Get transaction hash from database or dashboard
2. Visit: `https://sepolia.etherscan.io/tx/{tx_hash}`
3. View transaction details, block number, gas used

### Method 3: Query Contract Directly

```javascript
// Using ethers.js
const contract = new ethers.Contract(
  DRONE_FLIGHT_CONTRACT_ADDRESS,
  DRONE_FLIGHT_ABI,
  provider
);

// Get flight details
const flight = await contract.getFlight(
  flightId,
  droneId,
  startedAtUnix
);

console.log('Log Hash:', flight.logHash);
console.log('Recorder:', flight.recorder);
console.log('Samples:', flight.samplesCount);
```

## Verification Process

1. **Submit Flight Log**: POST to `/api/v1/drone-logs`
2. **Hash Computation**: Backend computes SHA-256 hash of canonicalized samples
3. **Database Storage**: Flight metadata and samples stored in PostgreSQL
4. **On-Chain Recording**: Hash recorded on Ethereum Sepolia via smart contract
5. **Verification**: Anyone can:
   - Download original flight log
   - Re-compute SHA-256 hash
   - Compare with on-chain hash to verify authenticity

## Data Canonicalization

For consistent hashing, samples are canonicalized:
- Numeric precision fixed (lat/lon: 7 decimals, speeds: 3 decimals)
- Keys sorted consistently
- UTF-8 encoding
- JSON serialization

This ensures the same flight log always produces the same hash.

## Example Flight Log

See `drone-simulator/index.js` for a complete example of a realistic DJI Mavic 3 flight log with:
- Takeoff sequence
- Climbing phase
- Hovering and maneuvering
- GPS coordinates near Bangkok
- Realistic telemetry values

## Troubleshooting

### Flight Not Tokenized

- Check blockchain configuration in `.env`
- Verify `DRONE_FLIGHT_CONTRACT_ADDRESS` is set
- Check backend logs for blockchain errors
- Ensure Sepolia RPC URL is accessible

### Database Migration

Run migration to create tables:
```bash
cd backend
node src/db/migrate.js
```

### Contract Deployment

Ensure you have:
- Sepolia testnet ETH for gas
- Private key in `.env`
- Correct network configuration in `hardhat.config.js`

## Next Steps

- [ ] Add MQTT publisher for real-time flight logs
- [ ] Implement flight log export (JSON/CSV)
- [ ] Add flight analytics (distance, area covered, etc.)
- [ ] Support multiple drone models
- [ ] Add flight log comparison/verification tool

