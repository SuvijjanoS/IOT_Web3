import pool from '../db/index.js';
import { mintLogToken } from '../blockchain/index.js';
import { ethers } from 'ethers';
import crypto from 'crypto';

// Helper function to hash data (same as in blockchain/index.js)
function hashData(data) {
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Retry tokenization for pending water quality readings
 */
export async function retryPendingReadings(limit = 50) {
  const client = await pool.connect();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get pending readings (no tx_hash)
    const pendingQuery = `
      SELECT id, sensor_id, ts, raw_json, data_hash
      FROM water_readings
      WHERE tx_hash IS NULL
      ORDER BY ts ASC
      LIMIT $1
    `;

    const pendingReadings = await client.query(pendingQuery, [limit]);

    for (const reading of pendingReadings.rows) {
      results.processed++;
      
      try {
        const timestampUnix = Math.floor(new Date(reading.ts).getTime() / 1000);
        
        // Convert data_hash from bytea to hex string
        let logHashBytes32;
        if (Buffer.isBuffer(reading.data_hash)) {
          logHashBytes32 = '0x' + reading.data_hash.toString('hex');
        } else {
          // Re-hash if needed
          const rawJsonString = typeof reading.raw_json === 'string' 
            ? reading.raw_json 
            : JSON.stringify(reading.raw_json);
          logHashBytes32 = hashData(rawJsonString);
        }
        
        // Find device wallet for this sensor (or use command center wallet as fallback)
        const { deviceWallet, deviceId } = await findDeviceWalletForSensorOrDrone(reading.sensor_id, null, null);
        
        const blockchainResult = await mintLogToken(
          deviceWallet,
          deviceId,
          logHashBytes32,
          'DEVICE_LOG',
          timestampUnix,
          ''
        );
        
        // Update database
        await client.query(
          'UPDATE water_readings SET tx_hash = $1, block_number = $2 WHERE id = $3',
          [blockchainResult.txHash, blockchainResult.blockNumber, reading.id]
        );
        
        results.succeeded++;
        console.log(`✅ Retried reading ${reading.id}: Token ID ${blockchainResult.tokenId}, TX ${blockchainResult.txHash}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: reading.id,
          sensor_id: reading.sensor_id,
          error: error.message
        });
        console.error(`❌ Failed to retry reading ${reading.id}:`, error.message);
      }
    }

    return results;
  } finally {
    client.release();
  }
}

/**
 * Retry tokenization for pending drone flights
 */
export async function retryPendingFlights(limit = 50) {
  const client = await pool.connect();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  try {
    // Get pending flights
    const pendingQuery = `
      SELECT flight_id, drone_id, drone_model, started_at_utc, log_hash
      FROM drone_flights
      WHERE tokenization_status = 'PENDING' OR tx_hash IS NULL
      ORDER BY started_at_utc ASC
      LIMIT $1
    `;

    const pendingFlights = await client.query(pendingQuery, [limit]);

    for (const flight of pendingFlights.rows) {
      results.processed++;
      
      try {
        const startedAtUnix = Math.floor(new Date(flight.started_at_utc).getTime() / 1000);
        
        // Convert log_hash from bytea to hex string
        let logHashBytes32;
        if (Buffer.isBuffer(flight.log_hash)) {
          logHashBytes32 = '0x' + flight.log_hash.toString('hex');
        } else {
          results.errors.push({
            flight_id: flight.flight_id,
            error: 'Log hash not found'
          });
          results.failed++;
          continue;
        }
        
        // Find device wallet for this drone (or use command center wallet as fallback)
        const { deviceWallet, deviceId } = await findDeviceWalletForSensorOrDrone(null, flight.drone_id, flight.drone_model);
        
        const blockchainResult = await mintLogToken(
          deviceWallet,
          deviceId,
          logHashBytes32,
          'DEVICE_LOG',
          startedAtUnix,
          ''
        );
        
        // Update database
        await client.query(
          'UPDATE drone_flights SET tokenization_status = $1, tx_hash = $2, block_number = $3 WHERE flight_id = $4',
          ['ON_CHAIN', blockchainResult.txHash, blockchainResult.blockNumber, flight.flight_id]
        );
        
        results.succeeded++;
        console.log(`✅ Retried flight ${flight.flight_id}: Token ID ${blockchainResult.tokenId}, TX ${blockchainResult.txHash}`);
      } catch (error) {
        results.failed++;
        results.errors.push({
          flight_id: flight.flight_id,
          error: error.message
        });
        console.error(`❌ Failed to retry flight ${flight.flight_id}:`, error.message);
      }
    }

    return results;
  } finally {
    client.release();
  }
}

/**
 * Simulate and tokenize a test reading
 */
export async function simulateAndTokenizeReading() {
  const client = await pool.connect();
  
  try {
    // Create a test reading
    const testReading = {
      sensor_id: 'sensor_test_001',
      ts: new Date().toISOString(),
      parameters: {
        ph: 7.2 + Math.random() * 0.5,
        temperature_c: 25 + Math.random() * 5,
        turbidity_ntu: 1.5 + Math.random() * 2,
        tds_mg_l: 150 + Math.random() * 50,
        dissolved_oxygen_mg_l: 8.0 + Math.random() * 2
      },
      battery_pct: 85 + Math.floor(Math.random() * 15),
      status: 'OK',
      location: {
        lat: 13.7563 + (Math.random() - 0.5) * 0.01,
        lng: 100.5018 + (Math.random() - 0.5) * 0.01
      }
    };

    const ts = new Date(testReading.ts);
    const rawJsonString = JSON.stringify(testReading);
    const dataHash = hashData(rawJsonString);
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
      testReading.sensor_id,
      ts,
      testReading.parameters.ph,
      testReading.parameters.temperature_c,
      testReading.parameters.turbidity_ntu,
      testReading.parameters.tds_mg_l,
      testReading.parameters.dissolved_oxygen_mg_l,
      testReading.battery_pct,
      testReading.status,
      testReading.location.lat,
      testReading.location.lng,
      rawJsonString,
      dataHashHex
    ]);

    const readingId = result.rows[0].id;

    // Use processSensorReading to tokenize each parameter separately
    // This will create datapoints and tokenize them individually
    const { processSensorReading } = await import('./sensorService.js');
    const topic = `water/quality/${testReading.sensor_id}`;
    
    // Process the reading (this will create datapoints and tokenize them)
    await processSensorReading(topic, testReading);

    // Get datapoints that were created
    const datapointsQuery = `
      SELECT parameter_name, COUNT(*) as count, COUNT(token_id) as tokenized_count
      FROM sensor_datapoints
      WHERE reading_id = $1
      GROUP BY parameter_name
    `;
    const datapointsResult = await client.query(datapointsQuery, [readingId]);

    return {
      success: true,
      readingId,
      datapoints: datapointsResult.rows,
      reading: testReading,
      message: 'Reading processed with per-datapoint tokenization'
    };
  } catch (error) {
    console.error('Failed to simulate and tokenize reading:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Simulate and tokenize a test drone flight
 */
export async function simulateAndTokenizeFlight() {
  const client = await pool.connect();
  
  try {
    // Create a test flight log
    const now = Date.now();
    const flightId = `TEST_FLIGHT_${now}`;
    const droneId = 'MAVIC3E_TEST_001';
    const numSamples = 10; // Small test flight
    
    const samples = [];
    const baseLat = 13.7563;
    const baseLon = 100.5018;
    
    for (let i = 0; i < numSamples; i++) {
      const t_ms = i * 2000; // 2 second intervals
      samples.push({
        t_ms,
        lat: baseLat + (Math.random() - 0.5) * 0.001,
        lon: baseLon + (Math.random() - 0.5) * 0.001,
        height_agl_m: 10 + i * 2,
        alt_asl_m: 20 + i * 2,
        pitch_deg: (Math.random() - 0.5) * 10,
        roll_deg: (Math.random() - 0.5) * 5,
        yaw_deg: i * 10,
        vx_ms: Math.random() * 2,
        vy_ms: Math.random() * 2,
        vz_ms: (Math.random() - 0.5) * 1,
        h_speed_ms: Math.random() * 5 + 2,
        gps_level: 4,
        gps_sats: 12,
        flight_mode: 'P',
        battery_pct: 90 - i,
        battery_voltage_v: 15.0 - i * 0.1
      });
    }

    const flightLog = {
      flight_id: flightId,
      drone_id: droneId,
      drone_model: 'DJI Mavic 3',
      started_at_utc: new Date(now - numSamples * 2000).toISOString(),
      samples
    };

    // Use the existing processDroneFlightLog function
    const { processDroneFlightLog } = await import('./droneFlightService.js');
    const result = await processDroneFlightLog(flightLog);

    return {
      success: true,
      flightId: result.flight_id,
      tokenization_status: result.tokenization_status,
      log_hash: result.log_hash
    };
  } catch (error) {
    console.error('Failed to simulate and tokenize flight:', error);
    throw error;
  } finally {
    client.release();
  }
}

