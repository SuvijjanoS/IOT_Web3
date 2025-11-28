import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Water Quality Contract ABI (minimal interface)
const WATER_QUALITY_ABI = [
  "function recordReading(string calldata sensorId, uint256 timestamp, bytes32 dataHash) external",
  "function recordCommand(string calldata sensorId, string calldata relayId, string calldata command, uint256 timestamp, bytes32 commandHash) external",
  "function getReading(string calldata sensorId, uint256 timestamp) external view returns (bytes32 dataHash, uint256 timestamp, string memory sensorId, address recorder)",
  "event ReadingRecorded(string indexed sensorId, uint256 indexed timestamp, bytes32 dataHash, address indexed recorder)",
  "event CommandRecorded(string indexed sensorId, string indexed relayId, string command, uint256 timestamp, bytes32 commandHash, address indexed recorder)"
];

// Drone Flight Contract ABI
const DRONE_FLIGHT_ABI = [
  "function recordFlight(string calldata flightId, string calldata droneId, string calldata droneModel, uint256 startedAt, bytes32 logHash, uint256 samplesCount, uint256 durationS) external",
  "function getFlight(string calldata flightId, string calldata droneId, uint256 startedAt) external view returns (bytes32 logHash, uint256 startedAt, string memory flightId, string memory droneId, string memory droneModel, address recorder, uint256 samplesCount, uint256 durationS)",
  "function getDroneFlights(string calldata droneId) external view returns (bytes32[] memory)",
  "event FlightRecorded(string indexed flightId, string indexed droneId, uint256 indexed startedAt, bytes32 logHash, string droneModel, uint256 samplesCount, address recorder)"
];

// Device Registry Contract ABI
const DEVICE_REGISTRY_ABI = [
  "function registerDevice(bytes32 deviceId, address wallet, bytes32 fingerprint) external",
  "function setDeviceStatus(bytes32 deviceId, bool active) external",
  "function getDevice(bytes32 deviceId) external view returns (address wallet, bytes32 fingerprint, bool isActive)",
  "function devices(bytes32) external view returns (address wallet, bytes32 fingerprint, bool isActive)",
  "event DeviceRegistered(bytes32 indexed deviceId, address wallet)",
  "event DeviceStatusChanged(bytes32 indexed deviceId, bool isActive)"
];

// Log Token Contract ABI (ERC-721)
const LOG_TOKEN_ABI = [
  "function mintLog(address to, bytes32 deviceId, bytes32 logHash, uint8 logType, uint64 loggedAt, string calldata uri) external returns (uint256 tokenId)",
  "function findTokensByHash(bytes32 logHash) external view returns (uint256[] memory)",
  "function getLogMeta(uint256 tokenId) external view returns (bytes32 logHash, bytes32 deviceId, uint8 logType, uint64 loggedAt, string memory uri)",
  "function logs(uint256) external view returns (bytes32 logHash, bytes32 deviceId, uint8 logType, uint64 loggedAt, string memory uri)",
  "function ownerOf(uint256 tokenId) external view returns (address owner)",
  "function nextTokenId() external view returns (uint256)",
  "event LogMinted(uint256 indexed tokenId, bytes32 indexed deviceId, bytes32 indexed logHash, uint8 logType, address owner)"
];

let provider = null;
let waterQualityContract = null;
let droneFlightContract = null;
let deviceRegistryContract = null;
let logTokenContract = null;
let signer = null;

export function initializeBlockchain() {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.PRIVATE_KEY) {
    console.warn('Blockchain configuration missing. Blockchain features will be disabled.');
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    if (process.env.CONTRACT_ADDRESS) {
      waterQualityContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, WATER_QUALITY_ABI, signer);
      console.log('Water Quality Contract initialized. Address:', process.env.CONTRACT_ADDRESS);
    }
    
    if (process.env.DRONE_FLIGHT_CONTRACT_ADDRESS) {
      droneFlightContract = new ethers.Contract(process.env.DRONE_FLIGHT_CONTRACT_ADDRESS, DRONE_FLIGHT_ABI, signer);
      console.log('Drone Flight Contract initialized. Address:', process.env.DRONE_FLIGHT_CONTRACT_ADDRESS);
    }
    
    if (process.env.DEVICE_REGISTRY_ADDRESS) {
      deviceRegistryContract = new ethers.Contract(process.env.DEVICE_REGISTRY_ADDRESS, DEVICE_REGISTRY_ABI, signer);
      console.log('Device Registry Contract initialized. Address:', process.env.DEVICE_REGISTRY_ADDRESS);
    }
    
    if (process.env.LOG_TOKEN_CONTRACT_ADDRESS) {
      logTokenContract = new ethers.Contract(process.env.LOG_TOKEN_CONTRACT_ADDRESS, LOG_TOKEN_ABI, signer);
      console.log('Log Token Contract initialized. Address:', process.env.LOG_TOKEN_CONTRACT_ADDRESS);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize blockchain:', error.message);
    return false;
  }
}

export function getContract() {
  return waterQualityContract;
}

export function getDroneFlightContract() {
  return droneFlightContract;
}

export function getProvider() {
  return provider;
}

export function getSigner() {
  return signer;
}

export function getDeviceRegistryContract() {
  return deviceRegistryContract;
}

export function getLogTokenContract() {
  return logTokenContract;
}

/**
 * Compute keccak256 hash of a JSON string
 */
export function hashData(jsonString) {
  return ethers.keccak256(ethers.toUtf8Bytes(jsonString));
}

/**
 * Record a reading on-chain
 */
export async function recordReadingOnChain(sensorId, timestamp, dataHash) {
  if (!waterQualityContract) {
    throw new Error('Blockchain not initialized');
  }

  try {
    const tx = await waterQualityContract.recordReading(sensorId, timestamp, dataHash);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Failed to record reading on-chain:', error);
    throw error;
  }
}

/**
 * Record a command on-chain
 */
export async function recordCommandOnChain(sensorId, relayId, command, timestamp, commandHash) {
  if (!waterQualityContract) {
    throw new Error('Blockchain not initialized');
  }

  try {
    const tx = await waterQualityContract.recordCommand(sensorId, relayId, command, timestamp, commandHash);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Failed to record command on-chain:', error);
    throw error;
  }
}

/**
 * Record a drone flight on-chain
 */
export async function recordFlightOnChain(flightId, droneId, droneModel, startedAt, logHash, samplesCount, durationS) {
  if (!droneFlightContract) {
    throw new Error('Drone Flight Contract not initialized');
  }

  try {
    const tx = await droneFlightContract.recordFlight(
      flightId,
      droneId,
      droneModel,
      startedAt,
      logHash,
      samplesCount,
      durationS
    );
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Failed to record flight on-chain:', error);
    throw error;
  }
}

/**
 * Register a device on-chain
 */
export async function registerDeviceOnChain(deviceIdHex, wallet, fingerprintHex) {
  if (!deviceRegistryContract) {
    throw new Error('Device Registry Contract not initialized');
  }

  try {
    const deviceId = ethers.hexlify(deviceIdHex);
    const fingerprint = ethers.hexlify(fingerprintHex);
    const tx = await deviceRegistryContract.registerDevice(deviceId, wallet, fingerprint);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Failed to register device on-chain:', error);
    throw error;
  }
}

/**
 * Set device status on-chain
 */
export async function setDeviceStatusOnChain(deviceIdHex, isActive) {
  if (!deviceRegistryContract) {
    throw new Error('Device Registry Contract not initialized');
  }

  try {
    const deviceId = ethers.hexlify(deviceIdHex);
    const tx = await deviceRegistryContract.setDeviceStatus(deviceId, isActive);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Failed to set device status on-chain:', error);
    throw error;
  }
}

/**
 * Get device from chain
 */
export async function getDeviceFromChain(deviceIdHex) {
  if (!deviceRegistryContract) {
    throw new Error('Device Registry Contract not initialized');
  }

  try {
    const deviceId = ethers.hexlify(deviceIdHex);
    const device = await deviceRegistryContract.getDevice(deviceId);
    return {
      wallet: device.wallet,
      fingerprint: device.fingerprint,
      isActive: device.isActive
    };
  } catch (error) {
    console.error('Failed to get device from chain:', error);
    throw error;
  }
}

/**
 * Mint a log token
 * @param {string} to - Address that will own the token
 * @param {string} deviceIdHex - Device identifier (bytes32 hex)
 * @param {string} logHashHex - SHA256 hash of log (bytes32 hex)
 * @param {string} logType - 'DEVICE_LOG' or 'COMMAND_LOG'
 * @param {number} loggedAt - Unix timestamp
 * @param {string} uri - Optional URI
 * @returns {Promise<Object>} Token ID, tx hash, block number
 */
export async function mintLogToken(to, deviceIdHex, logHashHex, logType, loggedAt, uri = '') {
  if (!logTokenContract) {
    throw new Error('Log Token Contract not initialized');
  }

  try {
    const deviceId = ethers.hexlify(deviceIdHex);
    const logHash = ethers.hexlify(logHashHex);
    
    // Convert logType string to enum (0 = DEVICE_LOG, 1 = COMMAND_LOG)
    const logTypeEnum = logType === 'COMMAND_LOG' ? 1 : 0;
    
    const tx = await logTokenContract.mintLog(
      to,
      deviceId,
      logHash,
      logTypeEnum,
      loggedAt,
      uri
    );
    const receipt = await tx.wait();
    
    // Parse events to get tokenId
    const logs = await logTokenContract.queryFilter(
      logTokenContract.filters.LogMinted(),
      receipt.blockNumber,
      receipt.blockNumber
    );
    
    let tokenId = null;
    if (logs.length > 0) {
      tokenId = logs[logs.length - 1].args.tokenId.toString();
    } else {
      // Fallback: query nextTokenId - 1
      const nextId = await logTokenContract.nextTokenId();
      tokenId = (BigInt(nextId) - 1n).toString();
    }
    
    return {
      tokenId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Failed to mint log token on-chain:', error);
    throw error;
  }
}

/**
 * Find tokens by log hash
 */
export async function findTokensByHash(logHashHex) {
  if (!logTokenContract) {
    throw new Error('Log Token Contract not initialized');
  }

  try {
    const logHash = ethers.hexlify(logHashHex);
    const tokenIds = await logTokenContract.findTokensByHash(logHash);
    return tokenIds.map(id => id.toString());
  } catch (error) {
    console.error('Failed to find tokens by hash:', error);
    throw error;
  }
}

