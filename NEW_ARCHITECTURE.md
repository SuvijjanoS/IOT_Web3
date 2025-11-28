# New Blockchain Architecture Implementation

## Overview

This document describes the new blockchain architecture for IoT device identity and log tokenization using ERC-721 NFTs.

## Architecture Components

### 1. Smart Contracts

#### DeviceRegistry.sol
- **Purpose**: Register IoT devices with blockchain IDs and wallet addresses
- **Key Functions**:
  - `registerDevice(bytes32 deviceId, address wallet, bytes32 fingerprint)` - Register a new device
  - `setDeviceStatus(bytes32 deviceId, bool active)` - Activate/deactivate device
  - `getDevice(bytes32 deviceId)` - Retrieve device information

#### LogToken.sol (ERC-721)
- **Purpose**: Mint NFTs representing log file hashes for tamper-proof verification
- **Key Functions**:
  - `mintLog(address to, bytes32 deviceId, bytes32 logHash, LogType, uint64 loggedAt, string uri)` - Mint a log token
  - `findTokensByHash(bytes32 logHash)` - Find tokens by hash
  - `getLogMeta(uint256 tokenId)` - Get token metadata

### 2. Database Schema

New tables added:
- **devices** - Device registry (device_id, device_wallet, manufacturer, model, etc.)
- **log_tokens** - ERC-721 token tracking (token_id, device_id, log_hash, log_type, etc.)
- **device_logs** - Device telemetry logs
- **command_logs** - Command center instruction logs

### 3. Backend Services

#### Device Service (`deviceService.js`)
- `registerDevice()` - Register new device (on-chain + DB)
- `getDevice()` - Get device by ID
- `getAllDevices()` - List all devices
- `setDeviceStatus()` - Activate/deactivate device

#### Log Token Service (`logTokenService.js`)
- `processDeviceLog()` - Process and tokenize device logs
- `processCommandLog()` - Process and tokenize command logs
- `verifyLog()` - Verify log integrity by re-hashing and checking for token

#### Canonicalization Utilities (`canonicalize.js`)
- `canonicalizeLog()` - Canonicalize log entries for consistent hashing
- `canonicalizeCommandLog()` - Canonicalize command log entries
- `hashLog()` - Compute SHA256 hash of canonicalized log
- `computeDeviceId()` - Compute deviceId from manufacturer/model/serial/nonce

### 4. API Endpoints

#### Device Management
- `POST /api/devices` - Register a new device
- `GET /api/devices` - List all devices
- `GET /api/devices/:deviceId` - Get device by ID
- `PATCH /api/devices/:deviceId/status` - Set device active/inactive

#### Log Tokenization
- `POST /api/device-logs` - Submit device log for tokenization
- `POST /api/command-logs` - Submit command log for tokenization
- `POST /api/verify-log` - Verify log integrity

## Deployment Steps

### 1. Deploy Contracts

```bash
cd contracts

# Deploy DeviceRegistry
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY" \
PRIVATE_KEY="0xYOUR_PRIVATE_KEY" \
npx hardhat run scripts/deploy-device-registry.js --network sepolia

# Deploy LogToken
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY" \
PRIVATE_KEY="0xYOUR_PRIVATE_KEY" \
npx hardhat run scripts/deploy-log-token.js --network sepolia
```

### 2. Configure Backend

Add to `backend/.env`:
```
DEVICE_REGISTRY_ADDRESS=0x...
LOG_TOKEN_CONTRACT_ADDRESS=0x...
COMMAND_CENTER_WALLET=0x...  # Wallet for command center
```

### 3. Run Database Migration

```bash
cd backend
node src/db/migrate.js
```

### 4. Restart Backend

```bash
docker-compose restart backend
```

## Usage Examples

### Register a Device

```bash
curl -X POST http://localhost:3001/api/devices \
  -H "Content-Type: application/json" \
  -d '{
    "manufacturer": "DJI",
    "model": "Mavic 3",
    "serial_number": "SN123456",
    "hardware_nonce": "HW789"
  }'
```

### Submit Device Log

```bash
curl -X POST http://localhost:3001/api/device-logs \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "0x...",
    "log_entries": [
      {"t_ms": 0, "lat": 13.7563, "lon": 100.5018, "height_agl_m": 0.1},
      {"t_ms": 1000, "lat": 13.7564, "lon": 100.5019, "height_agl_m": 5.2}
    ],
    "uri": "ipfs://..."
  }'
```

### Verify Log

```bash
curl -X POST http://localhost:3001/api/verify-log \
  -H "Content-Type: application/json" \
  -d '{
    "log_entries": [...],
    "is_command_log": false
  }'
```

## Design Notes

- **Off-chain storage**: Log files stored in database, only hashes on-chain
- **ERC-721 tokens**: Each log hash becomes an NFT owned by device or command center wallet
- **Canonicalization**: Critical for consistent hashing - fixed field order, precision, encoding
- **Verification**: Admin re-hashes log and checks for matching token on-chain
- **Tamper detection**: No matching token = log tampered or unauthorized

## Next Steps

1. Deploy contracts to Sepolia
2. Configure environment variables
3. Run database migrations
4. Test device registration
5. Test log tokenization
6. Test log verification

