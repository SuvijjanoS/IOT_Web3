import pool from '../db/index.js';
import { hashData, mintLogToken } from '../blockchain/index.js';
import { findDeviceWalletForSensorOrDrone } from './deviceService.js';
import { ethers } from 'ethers';

/**
 * Hash a single datapoint: hash(sensor_id + timestamp + parameter_name + parameter_value)
 */
function hashDatapoint(sensorId, timestamp, parameterName, parameterValue) {
  const timestampStr = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  const valueStr = typeof parameterValue === 'number' ? parameterValue.toString() : String(parameterValue);
  const combined = `${sensorId}|${timestampStr}|${parameterName}|${valueStr}`;
  return ethers.keccak256(ethers.toUtf8Bytes(combined));
}

/**
 * Process and store a sensor reading
 * Now tokenizes each parameter separately
 */
export async function processSensorReading(topic, data) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Extract sensor ID from topic (e.g., "water/quality/sensor_wq_001" -> "sensor_wq_001")
    const sensorId = topic.split('/').pop() || data.sensor_id || 'unknown';
    
    // Parse timestamp
    const ts = new Date(data.ts || Date.now());
    
    // Extract parameters
    const params = data.parameters || {};
    
    // Create raw JSON string for hashing (keep for backward compatibility)
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
    
    // Tokenize each parameter separately (async, don't block on this)
    const parameterNames = ['ph', 'temperature_c', 'turbidity_ntu', 'tds_mg_l', 'dissolved_oxygen_mg_l'];
    const timestampUnix = Math.floor(ts.getTime() / 1000);
    
    // Find device wallet for this sensor (or use command center wallet as fallback)
    const { deviceWallet, deviceId } = await findDeviceWalletForSensorOrDrone(sensorId, null, null);
    
    for (const paramName of parameterNames) {
      const paramValue = params[paramName];
      if (paramValue === null || paramValue === undefined) continue;
      
      try {
        // Hash the individual datapoint
        const datapointHash = hashDatapoint(sensorId, ts, paramName, paramValue);
        const datapointHashBytes32 = datapointHash; // Already in 0x format
        const datapointHashHex = '\\x' + Buffer.from(datapointHash.slice(2), 'hex').toString('hex');
        
        // Insert datapoint record
        const datapointInsertQuery = `
          INSERT INTO sensor_datapoints (
            reading_id, sensor_id, ts, parameter_name, parameter_value, datapoint_hash
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        
        const datapointResult = await client.query(datapointInsertQuery, [
          readingId,
          sensorId,
          ts,
          paramName,
          paramValue,
          datapointHashHex
        ]);
        
        const datapointId = datapointResult.rows[0].id;
        
        // Tokenize the datapoint on blockchain
        try {
          const blockchainResult = await mintLogToken(
            deviceWallet,
            deviceId,
            datapointHashBytes32,
            'DEVICE_LOG',
            timestampUnix,
            `sensor:${sensorId}|param:${paramName}|value:${paramValue}`
          );
          
          // Update datapoint with token info
          await client.query(
            'UPDATE sensor_datapoints SET token_id = $1, tx_hash = $2, block_number = $3 WHERE id = $4',
            [blockchainResult.tokenId, blockchainResult.txHash, blockchainResult.blockNumber, datapointId]
          );
          
          console.log(`✅ Datapoint ${datapointId} (${paramName}=${paramValue}) tokenized: Token ID ${blockchainResult.tokenId}, TX ${blockchainResult.txHash}`);
        } catch (blockchainError) {
          console.error(`Failed to tokenize datapoint ${paramName} on blockchain:`, blockchainError.message);
        }
      } catch (error) {
        console.error(`Failed to process datapoint ${paramName}:`, error.message);
        // Continue with other parameters
      }
    }
    
    await client.query('COMMIT');
    return readingId;
  } catch (error) {
    await client.query('ROLLBACK');
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
 * Get datapoints for a sensor and parameter (for time-series visualization)
 */
export async function getDatapoints(sensorId, parameterName, limit = 1000, offset = 0) {
  const query = `
    SELECT 
      id, reading_id, sensor_id, ts, parameter_name, parameter_value,
      datapoint_hash, token_id, tx_hash, block_number
    FROM sensor_datapoints
    WHERE sensor_id = $1 AND parameter_name = $2
    ORDER BY ts ASC
    LIMIT $3 OFFSET $4
  `;
  
  const result = await pool.query(query, [sensorId, parameterName, limit, offset]);
  return result.rows;
}

/**
 * Get all datapoints for a sensor (all parameters)
 */
export async function getAllDatapoints(sensorId, limit = 1000, offset = 0) {
  const query = `
    SELECT 
      id, reading_id, sensor_id, ts, parameter_name, parameter_value,
      datapoint_hash, token_id, tx_hash, block_number
    FROM sensor_datapoints
    WHERE sensor_id = $1
    ORDER BY ts ASC, parameter_name ASC
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

