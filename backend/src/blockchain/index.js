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

let provider = null;
let waterQualityContract = null;
let droneFlightContract = null;
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

