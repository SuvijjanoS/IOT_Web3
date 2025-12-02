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

    // Use processSensorReading which handles per-datapoint tokenization
    // This will create the reading AND tokenize each parameter separately
    const { processSensorReading } = await import('./sensorService.js');
    const topic = `water/quality/${testReading.sensor_id}`;
    
    // Process the reading (this creates reading, datapoints, and tokenizes them)
    const readingId = await processSensorReading(topic, testReading);

    // Get datapoints that were created
    const client = await pool.connect();
    try {
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
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to simulate and tokenize reading:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Simulate and tokenize a test drone flight
 */
export async function simulateAndTokenizeFlight() {
  const client = await pool.connect();
  
  try {
    // Create a realistic test flight log (Mavic 3 Enterprise)
    const now = Date.now();
    const flightId = `TEST_FLIGHT_${now}`;
    const droneId = 'MAVIC3E_TEST_001';
    
    // Flight parameters - realistic Mavic 3 Enterprise
    // Duration: 30 minutes ± 7 minutes (23-37 minutes)
    const baseDurationSeconds = 30 * 60;
    const durationVariation = (Math.random() - 0.5) * 14 * 60; // ±7 minutes
    const durationSeconds = Math.floor(baseDurationSeconds + durationVariation);
    const sampleRateMs = 2000; // 0.5 Hz sampling
    const numSamples = Math.floor((durationSeconds * 1000) / sampleRateMs);
    
    // Speed: 8-11 m/s (realistic cruise speed)
    const targetSpeedMin = 8.0;
    const targetSpeedMax = 11.0;
    const targetSpeed = targetSpeedMin + Math.random() * (targetSpeedMax - targetSpeedMin);
    
    // Altitude: 80-120m AGL (±20m from 100m target)
    const targetAltitudeMin = 80.0;
    const targetAltitudeMax = 120.0;
    
    // Choose a random city center location
    const locations = [
      { lat: 13.7649, lon: 100.5383, alt_asl: 12.0 }, // Bangkok Victory Monument
      { lat: 7.0083, lon: 100.4767, alt_asl: 10.0 },   // Hatyai City
      { lat: 19.9100, lon: 99.8317, alt_asl: 390.0 }   // Chiangrai City
    ];
    const location = locations[Math.floor(Math.random() * locations.length)];
    
    const samples = [];
    let currentLat = location.lat;
    let currentLon = location.lon;
    let currentHeightAgl = 0.1;
    let currentAltAsl = location.alt_asl + 0.1;
    let currentYaw = 0;
    let battery = 100;
    let batteryVoltage = 17.6; // Mavic 3 Enterprise 4S battery
    
    // Flight phases
    const takeoffDuration = 15; // seconds
    const cruiseStart = takeoffDuration;
    const landingStart = durationSeconds - 30;
    
    for (let i = 0; i < numSamples; i++) {
      const tMs = i * sampleRateMs;
      const tSeconds = tMs / 1000;
      
      // Phase 1: Takeoff (0-15 seconds)
      if (tSeconds < takeoffDuration) {
        const takeoffProgress = tSeconds / takeoffDuration;
        currentHeightAgl = 0.1 + (targetAltitudeMin * 0.8) * takeoffProgress;
        currentAltAsl = location.alt_asl + currentHeightAgl;
        currentLat = location.lat + (Math.random() - 0.5) * 0.00001;
        currentLon = location.lon + (Math.random() - 0.5) * 0.00001;
        currentYaw = 0 + (Math.random() - 0.5) * 5;
      }
      // Phase 2: Cruise flight
      else if (tSeconds < landingStart) {
        const cruiseTime = tSeconds - cruiseStart;
        const cruiseProgress = cruiseTime / (landingStart - cruiseStart);
        
        // Maintain altitude 80-120m AGL
        const baseAltitude = targetAltitudeMin + (targetAltitudeMax - targetAltitudeMin) * 0.5;
        currentHeightAgl = baseAltitude + Math.sin(cruiseTime * 0.1) * 5 + (Math.random() - 0.5) * 3;
        currentHeightAgl = Math.max(targetAltitudeMin, Math.min(targetAltitudeMax, currentHeightAgl));
        currentAltAsl = location.alt_asl + currentHeightAgl;
        
        // Patrol pattern around location
        const radiusKm = 0.3 + cruiseProgress * 0.5; // 0.3-0.8 km
        const angle = cruiseTime * 0.04;
        const radiusDeg = radiusKm / 111.0;
        const latOffset = radiusDeg * Math.cos(angle);
        const lonOffset = radiusDeg * Math.sin(angle) / Math.cos(location.lat * Math.PI / 180);
        currentLat = location.lat + latOffset + (Math.random() - 0.5) * 0.00005;
        currentLon = location.lon + lonOffset + (Math.random() - 0.5) * 0.00005;
        
        // Maintain target speed (with Mercator projection correction for longitude)
        if (samples.length > 0) {
          const prev = samples[samples.length - 1];
          const latDiff = currentLat - prev.lat;
          const lonDiff = currentLon - prev.lon;
          // Apply Mercator projection correction: longitude degrees compress at higher latitudes
          const latDiffM = latDiff * 111000; // 1 degree latitude ≈ 111km
          const lonDiffM = lonDiff * 111000 * Math.cos(location.lat * Math.PI / 180); // Longitude compression
          const distM = Math.sqrt(latDiffM * latDiffM + lonDiffM * lonDiffM);
          const timeDiff = sampleRateMs / 1000;
          const actualSpeed = distM / timeDiff;
          if (actualSpeed > 0.1) {
            const speedFactor = targetSpeed / actualSpeed;
            currentLat = prev.lat + latDiff * speedFactor;
            currentLon = prev.lon + lonDiff * speedFactor;
          }
        }
        
        // Yaw follows direction
        if (samples.length > 0) {
          const prevLat = samples[samples.length - 1].lat;
          const prevLon = samples[samples.length - 1].lon;
          const latDiff = currentLat - prevLat;
          const lonDiff = currentLon - prevLon;
          currentYaw = (Math.atan2(lonDiff, latDiff) * 180 / Math.PI + 360) % 360;
        }
      }
      // Phase 3: Landing
      else {
        const landingProgress = (tSeconds - landingStart) / (durationSeconds - landingStart);
        currentHeightAgl = targetAltitudeMin * (1 - landingProgress) + 0.1;
        currentAltAsl = location.alt_asl + currentHeightAgl;
        const returnProgress = landingProgress;
        currentLat = location.lat + (currentLat - location.lat) * (1 - returnProgress);
        currentLon = location.lon + (currentLon - location.lon) * (1 - returnProgress);
        currentYaw = 0;
      }
      
      // Calculate velocities
      let vx = 0, vy = 0, vz = 0, hSpeed = 0;
      if (samples.length > 0) {
        const prev = samples[samples.length - 1];
        const timeDiff = sampleRateMs / 1000;
        const latDiff = (currentLat - prev.lat) * 111000;
        const lonDiff = (currentLon - prev.lon) * 111000 * Math.cos(location.lat * Math.PI / 180);
        const altDiff = (currentHeightAgl - prev.height_agl_m);
        
        vx = lonDiff / timeDiff;
        vy = latDiff / timeDiff;
        vz = -altDiff / timeDiff;
        hSpeed = Math.sqrt(vx * vx + vy * vy);
      }
      
      // Battery drain
      if (tSeconds > 0) {
        battery = Math.max(20, 100 - (tSeconds / 60) * 1.2);
        batteryVoltage = 17.6 - ((100 - battery) / 100) * 1.5;
      }
      
      // Attitude
      const pitch = Math.sin(tSeconds * 0.2) * 5 + (Math.random() - 0.5) * 2;
      const roll = Math.cos(tSeconds * 0.15) * 3 + (Math.random() - 0.5) * 1.5;
      
      samples.push({
        t_ms: tMs,
        lat: parseFloat(currentLat.toFixed(7)),
        lon: parseFloat(currentLon.toFixed(7)),
        height_agl_m: parseFloat(currentHeightAgl.toFixed(2)),
        alt_asl_m: parseFloat(currentAltAsl.toFixed(2)),
        pitch_deg: parseFloat(pitch.toFixed(3)),
        roll_deg: parseFloat(roll.toFixed(3)),
        yaw_deg: parseFloat(currentYaw.toFixed(3)),
        vx_ms: parseFloat(vx.toFixed(3)),
        vy_ms: parseFloat(vy.toFixed(3)),
        vz_ms: parseFloat(vz.toFixed(3)),
        h_speed_ms: parseFloat(hSpeed.toFixed(3)),
        gps_level: 4 + Math.floor(Math.random() * 2),
        gps_sats: 18 + Math.floor(Math.random() * 5),
        flight_mode: 'P-GPS',
        rc_aileron_pct: parseFloat((roll * 10).toFixed(1)),
        rc_elevator_pct: parseFloat((pitch * 10).toFixed(1)),
        rc_throttle_pct: parseFloat((50 + pitch * 2).toFixed(1)),
        rc_rudder_pct: parseFloat(((currentYaw - (samples.length > 0 ? samples[samples.length - 1].yaw_deg : 0)) * 2).toFixed(1)),
        battery_pct: Math.floor(battery),
        battery_voltage_v: parseFloat(batteryVoltage.toFixed(2)),
        warnings: battery < 30 ? ['LOW_BATTERY'] : [],
        event_flags: {
          photo_taken: Math.random() > 0.95,
          video_rec: true,
          rth_active: tSeconds >= landingStart,
          obstacle_avoidance: true
        }
      });
    }

    const flightLog = {
      flight_id: flightId,
      drone_id: droneId,
      drone_model: 'DJI Mavic 3 Enterprise',
      started_at_utc: new Date(now - durationSeconds * 1000).toISOString(),
      home_point: {
        lat: location.lat,
        lon: location.lon,
        alt_asl_m: location.alt_asl
      },
      samples_hz: 0.5,
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

