import crypto from 'crypto';
import { ethers } from 'ethers';

/**
 * Canonicalize a log entry for consistent hashing
 * Ensures fixed field order, precision, and encoding
 */
export function canonicalizeLogEntry(entry) {
  // Define fixed field order for consistent hashing
  const orderedEntry = {};
  
  // Process fields in a consistent order
  const fieldOrder = [
    't_ms', 'lat', 'lon', 'height_agl_m', 'alt_asl_m',
    'pitch_deg', 'roll_deg', 'yaw_deg',
    'vx_ms', 'vy_ms', 'vz_ms', 'h_speed_ms',
    'gps_level', 'gps_sats', 'flight_mode',
    'rc_aileron_pct', 'rc_elevator_pct', 'rc_throttle_pct', 'rc_rudder_pct',
    'battery_pct', 'battery_voltage_v', 'warnings', 'event_flags'
  ];
  
  // Add fields in order, applying precision rules
  for (const field of fieldOrder) {
    if (entry[field] !== undefined) {
      let value = entry[field];
      
      // Apply precision rules
      if (typeof value === 'number') {
        if (['lat', 'lon'].includes(field)) {
          value = parseFloat(value.toFixed(7));
        } else if (['height_agl_m', 'alt_asl_m', 'battery_voltage_v'].includes(field)) {
          value = parseFloat(value.toFixed(2));
        } else if (['pitch_deg', 'roll_deg', 'yaw_deg', 'vx_ms', 'vy_ms', 'vz_ms', 'h_speed_ms', 
                     'rc_aileron_pct', 'rc_elevator_pct', 'rc_throttle_pct', 'rc_rudder_pct'].includes(field)) {
          value = parseFloat(value.toFixed(3));
        } else if (field === 't_ms' || field === 'battery_pct' || field === 'gps_level' || field === 'gps_sats') {
          value = parseInt(value);
        }
      }
      
      // Handle arrays and objects
      if (Array.isArray(value)) {
        value = JSON.parse(JSON.stringify(value)); // Deep clone and normalize
      } else if (typeof value === 'object' && value !== null) {
        value = JSON.parse(JSON.stringify(value)); // Deep clone and normalize
      }
      
      orderedEntry[field] = value;
    }
  }
  
  return orderedEntry;
}

/**
 * Canonicalize a command log entry
 */
export function canonicalizeCommandEntry(entry) {
  const orderedEntry = {};
  
  const fieldOrder = [
    'command_id', 'device_id', 'command_type', 'timestamp',
    'command_params', 'result', 'issued_by'
  ];
  
  for (const field of fieldOrder) {
    if (entry[field] !== undefined) {
      let value = entry[field];
      
      if (typeof value === 'object' && value !== null) {
        value = JSON.parse(JSON.stringify(value)); // Deep clone and normalize
      }
      
      orderedEntry[field] = value;
    }
  }
  
  return orderedEntry;
}

/**
 * Canonicalize an array of log entries and return as JSON string
 * @param {Array} entries - Array of log entries
 * @returns {string} Canonicalized JSON string (UTF-8 encoded)
 */
export function canonicalizeLog(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Log entries must be a non-empty array');
  }
  
  // Canonicalize each entry
  const canonicalEntries = entries.map(entry => canonicalizeLogEntry(entry));
  
  // Convert to JSON with no spaces, sorted keys
  return JSON.stringify(canonicalEntries, null, 0).replace(/\s+/g, '');
}

/**
 * Canonicalize a command log and return as JSON string
 * @param {Array} entries - Array of command log entries
 * @returns {string} Canonicalized JSON string (UTF-8 encoded)
 */
export function canonicalizeCommandLog(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Command log entries must be a non-empty array');
  }
  
  const canonicalEntries = entries.map(entry => canonicalizeCommandEntry(entry));
  
  return JSON.stringify(canonicalEntries, null, 0).replace(/\s+/g, '');
}

/**
 * Compute SHA256 hash of a canonicalized log
 * @param {string} canonicalString - Canonicalized JSON string
 * @returns {string} Hex string of SHA256 hash
 */
export function hashLog(canonicalString) {
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

/**
 * Compute deviceId from manufacturer, model, serialNumber, and hardwareNonce
 * @param {string} manufacturer
 * @param {string} model
 * @param {string} serialNumber
 * @param {string} hardwareNonce
 * @returns {string} Hex string of keccak256 hash (bytes32)
 */
export function computeDeviceId(manufacturer, model, serialNumber, hardwareNonce) {
  const combined = `${manufacturer}${model}${serialNumber}${hardwareNonce}`;
  return ethers.keccak256(ethers.toUtf8Bytes(combined));
}

