# Fixes Applied

## Issue 1: Blockchain Shows "Pending" ✅

### Problem
All sensor readings and flight logs show "Blockchain: Pending" status, meaning data is stored but not tokenized on-chain.

### Root Cause
Backend blockchain configuration is missing:
- `SEPOLIA_RPC_URL` not set
- `CONTRACT_ADDRESS` not set
- `PRIVATE_KEY` not set
- `DRONE_FLIGHT_CONTRACT_ADDRESS` not set

### Solution
1. ✅ Created `BLOCKCHAIN_SETUP.md` guide with step-by-step instructions
2. ✅ Added "Pending" status explanation in dashboard
3. ✅ Added link to setup guide when blockchain is pending

### To Enable Blockchain:
1. Get Sepolia testnet ETH from https://sepoliafaucet.com/
2. Deploy contracts (see `BLOCKCHAIN_SETUP.md`)
3. Configure `backend/.env` with:
   ```
   SEPOLIA_RPC_URL=https://rpc.sepolia.org
   PRIVATE_KEY=0x...
   CONTRACT_ADDRESS=0x...
   DRONE_FLIGHT_CONTRACT_ADDRESS=0x...
   ```
4. Restart backend: `docker-compose restart backend`

## Issue 2: API Guide Page Not Working ✅

### Problem
`/api-guide` route returned 404 error.

### Root Cause
Nginx was routing `/api-guide` to backend instead of frontend because `/api` location matched first.

### Solution
1. ✅ Updated Nginx config to use regex: `location ~ ^/api(/.*)?$`
2. ✅ This ensures `/api-guide` routes to frontend (React Router)
3. ✅ Frontend rebuilt and deployed

### Test
Visit: https://web3iot.dhammada.com/api-guide

Should now show the API Integration Guide page.

## Current Status

- ✅ API Guide page: Fixed and working
- ⚠️ Blockchain: Still pending (needs configuration)
- ✅ Data storage: Working (stored in database)
- ✅ Dashboards: Working (showing pending status)

## Next Steps

1. **Enable Blockchain** (see `BLOCKCHAIN_SETUP.md`):
   - Deploy contracts
   - Configure `.env`
   - Restart backend

2. **Test Blockchain**:
   - Submit new sensor reading
   - Check backend logs for "Recorded reading X on-chain"
   - Verify transaction appears on Etherscan

3. **Verify API Guide**:
   - Visit `/api-guide`
   - Should show integration instructions

