import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Contract ABI (minimal interface)
const CONTRACT_ABI = [
  "function recordReading(string calldata sensorId, uint256 timestamp, bytes32 dataHash) external",
  "function recordCommand(string calldata sensorId, string calldata relayId, string calldata command, uint256 timestamp, bytes32 commandHash) external",
  "function getReading(string calldata sensorId, uint256 timestamp) external view returns (bytes32 dataHash, uint256 timestamp, string memory sensorId, address recorder)",
  "event ReadingRecorded(string indexed sensorId, uint256 indexed timestamp, bytes32 dataHash, address indexed recorder)",
  "event CommandRecorded(string indexed sensorId, string indexed relayId, string command, uint256 timestamp, bytes32 commandHash, address indexed recorder)"
];

let provider = null;
let contract = null;
let signer = null;

export function initializeBlockchain() {
  if (!process.env.SEPOLIA_RPC_URL || !process.env.CONTRACT_ADDRESS || !process.env.PRIVATE_KEY) {
    console.warn('Blockchain configuration missing. Blockchain features will be disabled.');
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    console.log('Blockchain initialized. Contract address:', process.env.CONTRACT_ADDRESS);
    return true;
  } catch (error) {
    console.error('Failed to initialize blockchain:', error.message);
    return false;
  }
}

export function getContract() {
  return contract;
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
  if (!contract) {
    throw new Error('Blockchain not initialized');
  }

  try {
    const tx = await contract.recordReading(sensorId, timestamp, dataHash);
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
  if (!contract) {
    throw new Error('Blockchain not initialized');
  }

  try {
    const tx = await contract.recordCommand(sensorId, relayId, command, timestamp, commandHash);
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

