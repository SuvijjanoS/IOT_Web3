# Bug Fixes Applied

## Bug 1: Undefined `contract` variable in `recordReadingOnChain`

**Location**: `backend/src/blockchain/index.js` lines 82, 87

**Issue**: 
- The function referenced an undefined variable `contract` instead of `waterQualityContract`
- This caused all sensor readings to fail blockchain recording with "Blockchain not initialized" error, even when properly configured

**Fix**:
- Changed `if (!contract)` to `if (!waterQualityContract)` on line 82
- Changed `await contract.recordReading(...)` to `await waterQualityContract.recordReading(...)` on line 87

**Impact**: Sensor readings can now be properly recorded on-chain when blockchain is configured.

---

## Bug 2: Unhandled promise rejection in `publishControlCommand`

**Location**: 
- `backend/src/mqtt/index.js` lines 56-59
- `backend/src/services/controlService.js` line 44

**Issue**:
- `publishControlCommand` used a callback that could throw errors, but wasn't awaited
- Errors thrown in the callback would cause unhandled promise rejections, potentially crashing the application

**Fix**:
- Converted `publishControlCommand` to return a Promise that resolves/rejects based on MQTT publish result
- Added proper `await` and try-catch error handling in `controlService.js` when calling `publishControlCommand`
- Errors are now logged but don't crash the application (command is still stored in DB)

**Impact**: MQTT publish failures are now properly handled without causing application crashes.

---

## Files Modified

1. `backend/src/blockchain/index.js` - Fixed undefined variable reference
2. `backend/src/mqtt/index.js` - Converted callback to Promise-based API
3. `backend/src/services/controlService.js` - Added proper error handling for MQTT publish

## Testing Recommendations

1. **Bug 1**: Submit a sensor reading and verify it gets recorded on-chain (check for tx_hash in database)
2. **Bug 2**: Simulate MQTT connection failure and verify the application continues running (command should still be stored in DB)

