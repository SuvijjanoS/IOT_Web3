import pool from '../db/index.js';
import { hashData } from '../blockchain/index.js';
import { publishControlCommand } from '../mqtt/index.js';
import { processCommandLog } from './logTokenService.js';

/**
 * Send a control command to a device
 */
export async function sendControlCommand(sensorId, relayId, state, durationSec) {
  const client = await pool.connect();
  
  try {
    const command = {
      command: 'SET_RELAY',
      relay_id: relayId,
      state: state,
      duration_sec: durationSec
    };
    
    const commandJson = JSON.stringify(command);
    const commandHash = hashData(commandJson);
    const commandHashHex = '\\x' + Buffer.from(commandHash.slice(2), 'hex').toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Store command in database
    const insertQuery = `
      INSERT INTO control_commands (
        sensor_id, relay_id, command, state, duration_sec, command_hash
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const result = await client.query(insertQuery, [
      sensorId,
      relayId,
      commandJson,
      state,
      durationSec,
      commandHashHex
    ]);
    
    const commandId = result.rows[0].id;
    
    // Publish to MQTT (with error handling)
    try {
      await publishControlCommand(sensorId, command);
    } catch (mqttError) {
      console.error('Failed to publish control command via MQTT:', mqttError.message);
      // Continue execution - command is still stored in DB
    }
    
    // Tokenize command log on blockchain using LogToken contract (async)
    try {
      const commandCenterWallet = process.env.COMMAND_CENTER_WALLET || '0x23e224b79344d96fc00Ce7BdE1D5552d720a027b';
      
      // Find device ID for the sensor (if registered)
      let deviceIdHex = null;
      try {
        const deviceQuery = await client.query(
          'SELECT device_id FROM devices WHERE serial_number = $1 LIMIT 1',
          [sensorId]
        );
        if (deviceQuery.rows.length > 0) {
          deviceIdHex = '0x' + deviceQuery.rows[0].device_id.toString('hex').replace(/^00/, '');
        }
      } catch (deviceError) {
        // Device not found - use null (broadcast command)
        console.log(`Device not found for sensor ${sensorId}, using broadcast device ID`);
      }
      
      // Create command log entry for tokenization
      const commandEntries = [{
        command_type: 'SET_RELAY',
        command_params: {
          sensor_id: sensorId,
          relay_id: relayId,
          state: state,
          duration_sec: durationSec
        },
        timestamp: timestamp,
        result: null // Command result not available yet
      }];
      
      // Tokenize using LogToken contract
      console.log(`🔄 Attempting to tokenize command ${commandId}...`);
      const tokenizationResult = await processCommandLog(
        commandCenterWallet,
        deviceIdHex,
        commandEntries,
        `control:${commandId}`
      );
      
      console.log(`📋 Tokenization result for command ${commandId}:`, {
        status: tokenizationResult.status,
        tokenId: tokenizationResult.tokenId,
        txHash: tokenizationResult.txHash,
        blockNumber: tokenizationResult.blockNumber
      });
      
      // Update database with tokenization result
      if (tokenizationResult.txHash) {
        await client.query(
          'UPDATE control_commands SET tx_hash = $1, block_number = $2 WHERE id = $3',
          [tokenizationResult.txHash, tokenizationResult.blockNumber, commandId]
        );
        
        console.log(`✅ Command ${commandId} tokenized: Token ID ${tokenizationResult.tokenId}, TX ${tokenizationResult.txHash}`);
      } else {
        console.warn(`⚠️ Command ${commandId} stored but tokenization pending: ${tokenizationResult.status || 'UNKNOWN'}`);
      }
    } catch (blockchainError) {
      console.error('❌ Failed to tokenize command on blockchain:', {
        commandId,
        error: blockchainError.message,
        stack: blockchainError.stack
      });
      // Continue - command is still stored in DB, can retry tokenization later
    }
    
    return {
      id: commandId,
      command,
      timestamp
    };
  } catch (error) {
    console.error('Failed to send control command:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get control command history
 */
export async function getControlHistory(sensorId, limit = 50) {
  const query = `
    SELECT 
      id, sensor_id, relay_id, command, state, duration_sec,
      tx_hash, block_number, created_at
    FROM control_commands
    WHERE sensor_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [sensorId, limit]);
  return result.rows;
}

