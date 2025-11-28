import pool from '../db/index.js';
import { canonicalizeLog, canonicalizeCommandLog, hashLog } from '../utils/canonicalize.js';
import { mintLogToken, findTokensByHash } from '../blockchain/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Process and tokenize a device log
 * @param {string} deviceIdHex - Device identifier (bytes32 hex string)
 * @param {Array} logEntries - Array of log entries to canonicalize and hash
 * @param {string} uri - Optional URI pointing to log file (IPFS, S3, etc.)
 * @returns {Promise<Object>} Tokenization result
 */
export async function processDeviceLog(deviceIdHex, logEntries, uri = '') {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get device from database
    const deviceIdBytes = Buffer.from(deviceIdHex.slice(2), 'hex');
    const deviceResult = await client.query(
      'SELECT device_wallet, is_active FROM devices WHERE device_id = $1',
      ['\\x' + deviceIdBytes.toString('hex')]
    );
    
    if (deviceResult.rows.length === 0) {
      throw new Error('Device not found');
    }
    
    const device = deviceResult.rows[0];
    if (!device.is_active) {
      throw new Error('Device is not active');
    }
    
    // Canonicalize and hash the log
    const canonicalString = canonicalizeLog(logEntries);
    const logHashHex = hashLog(canonicalString);
    const logHashBytes = Buffer.from(logHashHex, 'hex');
    
    // Check if log already exists
    const existingCheck = await client.query(
      'SELECT token_id FROM log_tokens WHERE log_hash = $1',
      ['\\x' + logHashBytes.toString('hex')]
    );
    
    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        logId: null,
        tokenId: existingCheck.rows[0].token_id,
        logHash: logHashHex,
        status: 'DUPLICATE',
        message: 'Log already tokenized'
      };
    }
    
    // Store log in database
    const logId = uuidv4();
    const loggedAt = Math.floor(Date.now() / 1000); // Unix timestamp
    
    const logInsertQuery = `
      INSERT INTO device_logs (
        log_id, device_id, log_data, log_hash, logged_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    await client.query(logInsertQuery, [
      logId,
      '\\x' + deviceIdBytes.toString('hex'),
      JSON.stringify(logEntries),
      '\\x' + logHashBytes.toString('hex'),
      new Date(loggedAt * 1000)
    ]);
    
    // Mint token on-chain
    let tokenId = null;
    let txHash = null;
    let blockNumber = null;
    
    try {
      const mintResult = await mintLogToken(
        device.device_wallet,  // Token owner = device wallet
        deviceIdHex,
        '0x' + logHashHex,
        'DEVICE_LOG',
        loggedAt,
        uri
      );
      
      tokenId = mintResult.tokenId;
      txHash = mintResult.txHash;
      blockNumber = mintResult.blockNumber;
      
      // Store token in database
      const tokenInsertQuery = `
        INSERT INTO log_tokens (
          token_id, device_id, log_hash, log_type, logged_at,
          uri, owner_address, tx_hash, block_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await client.query(tokenInsertQuery, [
        tokenId,
        '\\x' + deviceIdBytes.toString('hex'),
        '\\x' + logHashBytes.toString('hex'),
        'DEVICE_LOG',
        loggedAt,
        uri,
        device.device_wallet,
        txHash,
        blockNumber
      ]);
      
      // Update device_logs with token_id
      await client.query(
        'UPDATE device_logs SET token_id = $1 WHERE log_id = $2',
        [tokenId, logId]
      );
      
    } catch (blockchainError) {
      console.error('Failed to mint log token on-chain:', blockchainError.message);
      // Continue - log is stored in DB, tokenization can be retried later
    }
    
    await client.query('COMMIT');
    
    return {
      logId,
      tokenId,
      logHash: logHashHex,
      status: tokenId ? 'TOKENIZED' : 'PENDING',
      txHash,
      blockNumber
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Process and tokenize a command log
 * @param {string} commandCenterWallet - Command center wallet address
 * @param {string} deviceIdHex - Target device ID (or null for broadcast)
 * @param {Array} commandEntries - Array of command log entries
 * @param {string} uri - Optional URI
 * @returns {Promise<Object>} Tokenization result
 */
export async function processCommandLog(commandCenterWallet, deviceIdHex, commandEntries, uri = '') {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Canonicalize and hash the command log
    const canonicalString = canonicalizeCommandLog(commandEntries);
    const logHashHex = hashLog(canonicalString);
    const logHashBytes = Buffer.from(logHashHex, 'hex');
    
    // Check if log already exists
    const existingCheck = await client.query(
      'SELECT token_id FROM log_tokens WHERE log_hash = $1',
      ['\\x' + logHashBytes.toString('hex')]
    );
    
    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        commandId: null,
        tokenId: existingCheck.rows[0].token_id,
        logHash: logHashHex,
        status: 'DUPLICATE',
        message: 'Command log already tokenized'
      };
    }
    
    // Store command log in database
    const commandId = uuidv4();
    const loggedAt = Math.floor(Date.now() / 1000);
    
    const deviceIdBytes = deviceIdHex ? Buffer.from(deviceIdHex.slice(2), 'hex') : null;
    
    const commandInsertQuery = `
      INSERT INTO command_logs (
        command_id, device_id, command_type, command_params,
        result, log_hash, logged_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const firstEntry = commandEntries[0];
    await client.query(commandInsertQuery, [
      commandId,
      deviceIdBytes ? '\\x' + deviceIdBytes.toString('hex') : null,
      firstEntry.command_type || 'UNKNOWN',
      JSON.stringify(firstEntry.command_params || {}),
      firstEntry.result ? JSON.stringify(firstEntry.result) : null,
      '\\x' + logHashBytes.toString('hex'),
      new Date(loggedAt * 1000)
    ]);
    
    // Use a special deviceId for command center if no specific device
    const targetDeviceId = deviceIdHex || '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    // Mint token on-chain
    let tokenId = null;
    let txHash = null;
    let blockNumber = null;
    
    try {
      const mintResult = await mintLogToken(
        commandCenterWallet,  // Token owner = command center wallet
        targetDeviceId,
        '0x' + logHashHex,
        'COMMAND_LOG',
        loggedAt,
        uri
      );
      
      tokenId = mintResult.tokenId;
      txHash = mintResult.txHash;
      blockNumber = mintResult.blockNumber;
      
      // Store token in database
      const tokenInsertQuery = `
        INSERT INTO log_tokens (
          token_id, device_id, log_hash, log_type, logged_at,
          uri, owner_address, tx_hash, block_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await client.query(tokenInsertQuery, [
        tokenId,
        deviceIdBytes ? '\\x' + deviceIdBytes.toString('hex') : null,
        '\\x' + logHashBytes.toString('hex'),
        'COMMAND_LOG',
        loggedAt,
        uri,
        commandCenterWallet,
        txHash,
        blockNumber
      ]);
      
      // Update command_logs with token_id
      await client.query(
        'UPDATE command_logs SET token_id = $1 WHERE command_id = $2',
        [tokenId, commandId]
      );
      
    } catch (blockchainError) {
      console.error('Failed to mint command log token on-chain:', blockchainError.message);
    }
    
    await client.query('COMMIT');
    
    return {
      commandId,
      tokenId,
      logHash: logHashHex,
      status: tokenId ? 'TOKENIZED' : 'PENDING',
      txHash,
      blockNumber
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify a log by re-hashing and checking for matching token
 * @param {Array} logEntries - Log entries to verify
 * @param {boolean} isCommandLog - Whether this is a command log
 * @returns {Promise<Object>} Verification result
 */
export async function verifyLog(logEntries, isCommandLog = false) {
  // Canonicalize and hash
  const canonicalString = isCommandLog 
    ? canonicalizeCommandLog(logEntries)
    : canonicalizeLog(logEntries);
  const logHashHex = hashLog(canonicalString);
  const logHashBytes = Buffer.from(logHashHex, 'hex');
  
  // Check database for matching token
  const dbResult = await pool.query(
    `SELECT 
      token_id, device_id, log_type, logged_at, uri,
      owner_address, tx_hash, block_number
    FROM log_tokens
    WHERE log_hash = $1`,
    ['\\x' + logHashBytes.toString('hex')]
  );
  
  if (dbResult.rows.length === 0) {
    // Also check on-chain
    try {
      const { findTokensByHash } = require('../blockchain/index.js');
      const chainTokens = await findTokensByHash('0x' + logHashHex);
      
      if (chainTokens.length === 0) {
        return {
          verified: false,
          status: 'NO_MATCH',
          message: 'Log hash not found - possible tampering or unauthorized log',
          logHash: logHashHex
        };
      }
      
      // Found on-chain but not in DB - sync needed
      return {
        verified: true,
        status: 'FOUND_ON_CHAIN',
        message: 'Token found on-chain but not in database',
        tokenIds: chainTokens,
        logHash: logHashHex
      };
    } catch (error) {
      return {
        verified: false,
        status: 'NO_MATCH',
        message: 'Log hash not found',
        logHash: logHashHex,
        error: error.message
      };
    }
  }
  
  if (dbResult.rows.length === 1) {
    const token = dbResult.rows[0];
    return {
      verified: true,
      status: 'MATCHED',
      message: `Matched token #${token.token_id}`,
      tokenId: token.token_id,
      logHash: logHashHex,
      deviceId: token.device_id ? '0x' + token.device_id.toString('hex').replace(/^00/, '') : null,
      logType: token.log_type,
      loggedAt: token.logged_at,
      owner: token.owner_address,
      txHash: token.tx_hash,
      blockNumber: token.block_number ? token.block_number.toString() : null
    };
  }
  
  // Multiple matches (shouldn't happen, but handle it)
  return {
    verified: true,
    status: 'MULTIPLE_MATCHES',
    message: `Found ${dbResult.rows.length} tokens with same hash - possible anomaly`,
    tokens: dbResult.rows.map(t => ({
      tokenId: t.token_id,
      owner: t.owner_address,
      txHash: t.tx_hash
    })),
    logHash: logHashHex
  };
}

