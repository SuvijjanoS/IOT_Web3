import pool from '../db/index.js';
import { hashData, mintLogToken } from '../blockchain/index.js';
import { findDeviceWalletForSensorOrDrone } from './deviceService.js';
import { ethers } from 'ethers';

/**
 * Hash entire reading: hash(sensor_id + timestamp + all parameter values)
 */
function hashReading(sensorId, timestamp, parameters) {
  const timestampStr = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  // Sort parameters for consistent hashing
  const sortedParams = Object.keys(parameters).sort().map(key => `${key}:${parameters[key]}`).join('|');
  const combined = `${sensorId}|${timestampStr}|${sortedParams}`;
  return ethers.keccak256(ethers.toUtf8Bytes(combined));
}

/**
 * Process and store a sensor reading
 * Tokenizes the entire reading (sensor_id + timestamp + all parameters)
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
    
    // Hash entire reading: sensor_id + timestamp + all parameter values
    const readingHash = hashReading(sensorId, ts, params);
    const readingHashBytes32 = readingHash; // Already in 0x format
    const readingHashHex = '\\x' + Buffer.from(readingHash.slice(2), 'hex').toString('hex');
    
    // Also keep raw JSON hash for backward compatibility
    const rawJsonString = JSON.stringify(data);
    const dataHash = hashData(rawJsonString);
    const dataHashHex = '\\x' + Buffer.from(dataHash.slice(2), 'hex').toString('hex');
    
    // Insert into database
    const insertQuery = `
      INSERT INTO water_readings (
        sensor_id, ts, ph, temperature_c, turbidity_ntu, tds_mg_l,
        dissolved_oxygen_mg_l, flow_rate_lpm, battery_pct, status, location_lat, location_lng,
        raw_json, data_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      params.flow_rate_lpm || null,
      data.battery_pct || null,
      data.status || 'OK',
      data.location?.lat || null,
      data.location?.lng || null,
      JSON.stringify(data),
      dataHashHex
    ]);
    
    const readingId = result.rows[0].id;
    const timestampUnix = Math.floor(ts.getTime() / 1000);
    
    // Find device wallet for this sensor (or use command center wallet as fallback)
    const { deviceWallet, deviceId } = await findDeviceWalletForSensorOrDrone(sensorId, null, null);
    
    // Tokenize the entire reading (not per-parameter)
    try {
      const blockchainResult = await mintLogToken(
        deviceWallet,
        deviceId,
        readingHashBytes32,
        'DEVICE_LOG',
        timestampUnix,
        `sensor:${sensorId}|reading:${readingId}`
      );
      
      // Update reading with token info
      await client.query(
        'UPDATE water_readings SET token_id = $1, tx_hash = $2, block_number = $3 WHERE id = $4',
        [blockchainResult.tokenId, blockchainResult.txHash, blockchainResult.blockNumber, readingId]
      );
      
      console.log(`✅ Reading ${readingId} tokenized: Token ID ${blockchainResult.tokenId}, TX ${blockchainResult.txHash}`);
    } catch (blockchainError) {
      console.error(`Failed to tokenize reading on blockchain:`, blockchainError.message);
      // Don't fail the whole operation if tokenization fails
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
      dissolved_oxygen_mg_l, flow_rate_lpm, battery_pct, status, location_lat, location_lng,
      raw_json, tx_hash, block_number, token_id
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
  // Convert Buffer objects to hex strings for JSON serialization
  return result.rows.map(row => ({
    ...row,
    datapoint_hash: row.datapoint_hash ? '0x' + row.datapoint_hash.toString('hex') : null
  }));
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
  // Convert Buffer objects to hex strings for JSON serialization
  return result.rows.map(row => ({
    ...row,
    datapoint_hash: row.datapoint_hash ? '0x' + row.datapoint_hash.toString('hex') : null
  }));
}

/**
 * Get all sensors (including registered devices without readings)
 */
export async function getAllSensors() {
  // Get sensors from water_readings
  const readingsQuery = `
    SELECT DISTINCT wr.sensor_id, 
           MAX(wr.ts) as last_reading,
           COUNT(wr.id) as reading_count,
           COUNT(wr.token_id) as tokenized_readings
    FROM water_readings wr
    GROUP BY wr.sensor_id
  `;
  
  const readingsResult = await pool.query(readingsQuery);
  const sensorsWithReadings = readingsResult.rows;
  
  // Get all registered devices that might not have readings yet
  const devicesQuery = `
    SELECT serial_number as sensor_id,
           registered_at as last_reading,
           0 as reading_count,
           0 as tokenized_readings
    FROM devices
    WHERE (model LIKE '%Sensor%' OR model LIKE '%WW%' OR manufacturer LIKE '%IoT%')
      AND serial_number NOT IN (SELECT DISTINCT sensor_id FROM water_readings)
  `;
  
  const devicesResult = await pool.query(devicesQuery);
  const registeredDevices = devicesResult.rows;
  
  // Merge and deduplicate (prefer sensors with readings)
  const sensorMap = new Map();
  
  // Add sensors with readings first
  sensorsWithReadings.forEach(sensor => {
    sensorMap.set(sensor.sensor_id, sensor);
  });
  
  // Add registered devices that don't have readings
  registeredDevices.forEach(device => {
    if (!sensorMap.has(device.sensor_id)) {
      sensorMap.set(device.sensor_id, device);
    }
  });
  
  // Convert to array and sort by last_reading
  return Array.from(sensorMap.values()).sort((a, b) => {
    const dateA = a.last_reading ? new Date(a.last_reading) : new Date(0);
    const dateB = b.last_reading ? new Date(b.last_reading) : new Date(0);
    return dateB - dateA;
  });
}

