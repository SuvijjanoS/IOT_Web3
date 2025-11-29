import pool from '../db/index.js';
import { hashData, recordFlightOnChain } from '../blockchain/index.js';
import crypto from 'crypto';

/**
 * Canonicalize flight samples for consistent hashing
 */
function canonicalizeSamples(samples) {
  return samples.map(sample => ({
    t_ms: sample.t_ms,
    lat: Number(sample.lat.toFixed(7)),
    lon: Number(sample.lon.toFixed(7)),
    height_agl_m: Number(sample.height_agl_m.toFixed(2)),
    alt_asl_m: sample.alt_asl_m ? Number(sample.alt_asl_m.toFixed(2)) : null,
    pitch_deg: Number(sample.pitch_deg.toFixed(3)),
    roll_deg: Number(sample.roll_deg.toFixed(3)),
    yaw_deg: Number(sample.yaw_deg.toFixed(3)),
    vx_ms: Number(sample.vx_ms.toFixed(3)),
    vy_ms: Number(sample.vy_ms.toFixed(3)),
    vz_ms: Number(sample.vz_ms.toFixed(3)),
    h_speed_ms: Number(sample.h_speed_ms.toFixed(3)),
    gps_level: sample.gps_level,
    gps_sats: sample.gps_sats,
    flight_mode: sample.flight_mode,
    rc_aileron_pct: Number(sample.rc_aileron_pct.toFixed(1)),
    rc_elevator_pct: Number(sample.rc_elevator_pct.toFixed(1)),
    rc_throttle_pct: Number(sample.rc_throttle_pct.toFixed(1)),
    rc_rudder_pct: Number(sample.rc_rudder_pct.toFixed(1)),
    battery_pct: sample.battery_pct,
    battery_voltage_v: Number(sample.battery_voltage_v.toFixed(2)),
    warnings: sample.warnings || [],
    event_flags: sample.event_flags || {}
  }));
}

/**
 * Compute SHA256 hash of canonicalized flight log
 */
function computeFlightLogHash(samples) {
  const canonical = canonicalizeSamples(samples);
  const canonicalJson = JSON.stringify(canonical, Object.keys(canonical[0] || {}).sort());
  return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

/**
 * Process and store a drone flight log
 */
export async function processDroneFlightLog(flightLog) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Validate flight log
    if (flightLog.drone_model !== 'DJI Mavic 3') {
      throw new Error('Unsupported drone_model. Only DJI Mavic 3 is supported.');
    }

    if (!Array.isArray(flightLog.samples) || flightLog.samples.length === 0) {
      throw new Error('Flight log must contain at least one sample');
    }

    // Validate monotonic time
    for (let i = 1; i < flightLog.samples.length; i++) {
      if (flightLog.samples[i].t_ms <= flightLog.samples[i - 1].t_ms) {
        throw new Error('t_ms must be strictly increasing');
      }
    }

    // Compute hash
    const logHashHex = computeFlightLogHash(flightLog.samples);
    const logHashBytes = Buffer.from(logHashHex, 'hex');

    // Calculate flight statistics
    const samples = flightLog.samples;
    const durationS = (samples[samples.length - 1].t_ms - samples[0].t_ms) / 1000;
    const maxHeightAgl = Math.max(...samples.map(s => s.height_agl_m || 0));
    const maxAltAsl = Math.max(...samples.map(s => s.alt_asl_m || 0));
    const maxHSpeed = Math.max(...samples.map(s => s.h_speed_ms || 0));

    // Parse start time
    const startedAt = new Date(flightLog.started_at_utc);

    // Insert flight metadata
    const flightInsertQuery = `
      INSERT INTO drone_flights (
        flight_id, drone_id, drone_model, started_at_utc,
        firmware_version, app_name, app_version,
        home_point_lat, home_point_lon, home_point_alt_asl_m,
        samples_hz, samples_count, duration_s,
        max_height_agl_m, max_alt_asl_m, max_h_speed_ms,
        log_hash, raw_json, tokenization_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (flight_id) DO UPDATE SET
        drone_id = EXCLUDED.drone_id,
        started_at_utc = EXCLUDED.started_at_utc,
        samples_count = EXCLUDED.samples_count
      RETURNING id
    `;

    const flightResult = await client.query(flightInsertQuery, [
      flightLog.flight_id,
      flightLog.drone_id,
      flightLog.drone_model,
      startedAt,
      flightLog.firmware_version || null,
      flightLog.app_name || null,
      flightLog.app_version || null,
      flightLog.home_point?.lat || null,
      flightLog.home_point?.lon || null,
      flightLog.home_point?.alt_asl_m || null,
      flightLog.samples_hz || null,
      samples.length,
      durationS,
      maxHeightAgl || 0,
      maxAltAsl || 0,
      maxHSpeed || 0,
      '\\x' + logHashBytes.toString('hex'),
      JSON.stringify(flightLog),
      'PENDING'
    ]);

    if (flightResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Flight already exists');
    }

    // Insert samples in batches to avoid query size limits
    const batchSize = 100;
    for (let i = 0; i < samples.length; i += batchSize) {
      const batch = samples.slice(i, i + batchSize);
      const placeholders = batch.map((_, idx) => {
        const base = idx * 24; // 24 columns per sample
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17}, $${base + 18}, $${base + 19}, $${base + 20}, $${base + 21}, $${base + 22}, $${base + 23}, $${base + 24})`;
      }).join(', ');

      const sampleInsertQuery = `
        INSERT INTO drone_flight_samples (
          flight_id, t_ms, lat, lon, height_agl_m, alt_asl_m,
          pitch_deg, roll_deg, yaw_deg,
          vx_ms, vy_ms, vz_ms, h_speed_ms,
          gps_level, gps_sats, flight_mode,
          rc_aileron_pct, rc_elevator_pct, rc_throttle_pct, rc_rudder_pct,
          battery_pct, battery_voltage_v, warnings, event_flags
        ) VALUES ${placeholders}
      `;

      const sampleValues = batch.flatMap(s => [
        flightLog.flight_id,
        s.t_ms,
        s.lat,
        s.lon,
        s.height_agl_m,
        s.alt_asl_m || null,
        s.pitch_deg,
        s.roll_deg,
        s.yaw_deg,
        s.vx_ms,
        s.vy_ms,
        s.vz_ms,
        s.h_speed_ms,
        s.gps_level,
        s.gps_sats,
        s.flight_mode,
        s.rc_aileron_pct,
        s.rc_elevator_pct,
        s.rc_throttle_pct,
        s.rc_rudder_pct,
        s.battery_pct,
        s.battery_voltage_v,
        JSON.stringify(s.warnings || []),
        JSON.stringify(s.event_flags || {})
      ]);

      await client.query(sampleInsertQuery, sampleValues);
    }

    await client.query('COMMIT');

    // Try to record on-chain (async, don't fail if it fails)
    try {
      const startedAtUnix = Math.floor(startedAt.getTime() / 1000);
      const logHashBytes32 = '0x' + logHashHex;
      const result = await recordFlightOnChain(
        flightLog.flight_id,
        flightLog.drone_id,
        flightLog.drone_model,
        startedAtUnix,
        logHashBytes32,
        samples.length,
        Math.floor(durationS)
      );

      // Update flight with on-chain info
      await client.query(
        'UPDATE drone_flights SET tokenization_status = $1, tx_hash = $2, block_number = $3 WHERE flight_id = $4',
        ['ON_CHAIN', result.txHash, result.blockNumber, flightLog.flight_id]
      );
    } catch (error) {
      console.error('Failed to record flight on-chain:', error);
      // Don't fail the whole operation
    }

    return {
      flight_id: flightLog.flight_id,
      log_hash: logHashHex,
      tokenization_status: 'PENDING'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all drone flights
 */
export async function getDroneFlights(limit = 50, offset = 0) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        flight_id, drone_id, drone_model, started_at_utc,
        samples_count, duration_s, max_height_agl_m, max_h_speed_ms,
        tokenization_status, tx_hash, block_number, created_at
       FROM drone_flights
       ORDER BY started_at_utc DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get a specific flight by flight_id
 */
export async function getFlightById(flightId) {
  const client = await pool.connect();
  try {
    const flightResult = await client.query(
      `SELECT * FROM drone_flights WHERE flight_id = $1`,
      [flightId]
    );

    if (flightResult.rows.length === 0) {
      return null;
    }

    const samplesResult = await client.query(
      `SELECT * FROM drone_flight_samples 
       WHERE flight_id = $1 
       ORDER BY t_ms ASC`,
      [flightId]
    );

    return {
      ...flightResult.rows[0],
      samples: samplesResult.rows
    };
  } finally {
    client.release();
  }
}

/**
 * Get all flights for a specific drone
 */
export async function getFlightsByDroneId(droneId, limit = 50) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        flight_id, drone_id, drone_model, started_at_utc,
        samples_count, duration_s, max_height_agl_m, max_h_speed_ms,
        tokenization_status, tx_hash, block_number
       FROM drone_flights
       WHERE drone_id = $1
       ORDER BY started_at_utc DESC
       LIMIT $2`,
      [droneId, limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Get all unique drones
 */
export async function getAllDrones() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        drone_id,
        COUNT(*) as flight_count,
        MAX(started_at_utc) as last_flight
       FROM drone_flights
       GROUP BY drone_id
       ORDER BY last_flight DESC`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

