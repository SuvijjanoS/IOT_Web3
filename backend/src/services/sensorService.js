import pool from '../db/index.js';
import { hashData, mintLogToken } from '../blockchain/index.js';

/**
 * Process and store a sensor reading
 */
export async function processSensorReading(topic, data) {
  const client = await pool.connect();
  
  try {
    // Extract sensor ID from topic (e.g., "water/quality/sensor_wq_001" -> "sensor_wq_001")
    const sensorId = topic.split('/').pop() || data.sensor_id || 'unknown';
    
    // Parse timestamp
    const ts = new Date(data.ts || Date.now());
    
    // Extract parameters
    const params = data.parameters || {};
    
    // Create raw JSON string for hashing
    const rawJsonString = JSON.stringify(data);
    const dataHash = hashData(rawJsonString);
    
    // Convert hash to hex string for storage
    const dataHashHex = '\\x' + Buffer.from(dataHash.slice(2), 'hex').toString('hex');
    
    // Insert into database
    const insertQuery = `
      INSERT INTO water_readings (
        sensor_id, ts, ph, temperature_c, turbidity_ntu, tds_mg_l,
        dissolved_oxygen_mg_l, battery_pct, status, location_lat, location_lng,
        raw_json, data_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `;
    
    const result = await client.query(insertQuery, [
      sensorId,
      ts,
      params.ph || null,
      params.temperature_c || null,
      params.turbidity_ntu || null,
      params.tds_mg_l || null,
      params.dissolved_oxygen_mg_l || null,
      data.battery_pct || null,
      data.status || 'OK',
      data.location?.lat || null,
      data.location?.lng || null,
      JSON.stringify(data),
      dataHashHex
    ]);
    
    const readingId = result.rows[0].id;
    
    // Tokenize on blockchain using LogToken contract (async, don't block on this)
    try {
      const timestampUnix = Math.floor(ts.getTime() / 1000);
      const logHashBytes32 = dataHash; // Already in 0x format from hashData
      
      // Use command center wallet as owner (sensors may not be registered as devices)
      const commandCenterWallet = process.env.COMMAND_CENTER_WALLET || '0x23e224b79344d96fc00Ce7BdE1D5552d720a027b';
      
      // Use zero address as deviceId for unregistered sensors
      const deviceIdHex = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      const blockchainResult = await mintLogToken(
        commandCenterWallet,  // Token owner
        deviceIdHex,           // Device ID (zero for unregistered sensors)
        logHashBytes32,        // Log hash
        'DEVICE_LOG',          // Log type
        timestampUnix,         // Timestamp
        ''                     // URI (empty for now)
      );
      
      // Update database with tx hash
      await client.query(
        'UPDATE water_readings SET tx_hash = $1, block_number = $2 WHERE id = $3',
        [blockchainResult.txHash, blockchainResult.blockNumber, readingId]
      );
      
      console.log(`✅ Reading ${readingId} tokenized: Token ID ${blockchainResult.tokenId}, TX ${blockchainResult.txHash}`);
    } catch (blockchainError) {
      console.error('Failed to tokenize on blockchain (continuing anyway):', blockchainError.message);
    }
    
    return readingId;
  } catch (error) {
    console.error('Failed to process sensor reading:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get readings for a sensor
 */
export async function getReadings(sensorId, limit = 100, offset = 0) {
  const query = `
    SELECT 
      id, sensor_id, ts, ph, temperature_c, turbidity_ntu, tds_mg_l,
      dissolved_oxygen_mg_l, battery_pct, status, location_lat, location_lng,
      raw_json, tx_hash, block_number
    FROM water_readings
    WHERE sensor_id = $1
    ORDER BY ts DESC
    LIMIT $2 OFFSET $3
  `;
  
  const result = await pool.query(query, [sensorId, limit, offset]);
  return result.rows;
}

/**
 * Get all sensors
 */
export async function getAllSensors() {
  const query = `
    SELECT DISTINCT sensor_id, 
           MAX(ts) as last_reading,
           COUNT(*) as reading_count
    FROM water_readings
    GROUP BY sensor_id
    ORDER BY last_reading DESC
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

