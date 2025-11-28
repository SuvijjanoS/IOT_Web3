import pool from '../db/index.js';
import { hashData, recordCommandOnChain } from '../blockchain/index.js';
import { publishControlCommand } from '../mqtt/index.js';

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
    
    // Publish to MQTT
    publishControlCommand(sensorId, command);
    
    // Record on blockchain (async)
    try {
      const blockchainResult = await recordCommandOnChain(
        sensorId,
        relayId,
        commandJson,
        timestamp,
        commandHash
      );
      
      // Update database with tx hash
      await client.query(
        'UPDATE control_commands SET tx_hash = $1, block_number = $2 WHERE id = $3',
        [blockchainResult.txHash, blockchainResult.blockNumber, commandId]
      );
      
      console.log(`Recorded command ${commandId} on-chain: ${blockchainResult.txHash}`);
    } catch (blockchainError) {
      console.error('Failed to record command on blockchain:', blockchainError.message);
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

