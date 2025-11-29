import pool from '../db/index.js';
import { computeDeviceId } from '../utils/canonicalize.js';
import { registerDeviceOnChain, getDeviceFromChain } from '../blockchain/index.js';
import { ethers } from 'ethers';

/**
 * Register a new device
 * @param {Object} deviceData - Device information
 * @param {string} deviceData.manufacturer
 * @param {string} deviceData.model
 * @param {string} deviceData.serialNumber
 * @param {string} deviceData.hardwareNonce
 * @param {string} deviceData.deviceWallet - Ethereum address (optional, will generate if not provided)
 * @returns {Promise<Object>} Registered device information
 */
export async function registerDevice(deviceData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Compute deviceId
    const deviceIdHex = computeDeviceId(
      deviceData.manufacturer,
      deviceData.model,
      deviceData.serialNumber,
      deviceData.hardwareNonce
    );
    const deviceIdBytes = Buffer.from(deviceIdHex.slice(2), 'hex');
    
    // Generate wallet if not provided
    let deviceWallet = deviceData.deviceWallet;
    let devicePrivkey = null;
    
    if (!deviceWallet) {
      const wallet = ethers.Wallet.createRandom();
      deviceWallet = wallet.address;
      devicePrivkey = wallet.privateKey; // In production, encrypt this
    }
    
    // Check if device already exists
    const existingCheck = await client.query(
      'SELECT id FROM devices WHERE device_id = $1',
      ['\\x' + deviceIdBytes.toString('hex')]
    );
    
    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new Error('Device already registered');
    }
    
    // Store in database
    const fingerprint = deviceIdBytes; // Use deviceId as fingerprint
    const insertQuery = `
      INSERT INTO devices (
        device_id, device_wallet, device_privkey_encrypted,
        manufacturer, model, serial_number, hardware_nonce,
        fingerprint, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, registered_at
    `;
    
    const result = await client.query(insertQuery, [
      '\\x' + deviceIdBytes.toString('hex'),
      deviceWallet,
      devicePrivkey, // TODO: Encrypt in production
      deviceData.manufacturer,
      deviceData.model,
      deviceData.serialNumber,
      deviceData.hardwareNonce,
      '\\x' + fingerprint.toString('hex'),
      true
    ]);
    
    // Register on-chain
    try {
      await registerDeviceOnChain(
        deviceIdHex,
        deviceWallet,
        fingerprint.toString('hex')
      );
    } catch (blockchainError) {
      console.error('Failed to register device on-chain:', blockchainError.message);
      // Continue - device is still registered in DB
    }
    
    await client.query('COMMIT');
    
    return {
      id: result.rows[0].id,
      deviceId: deviceIdHex,
      deviceWallet,
      manufacturer: deviceData.manufacturer,
      model: deviceData.model,
      serialNumber: deviceData.serialNumber,
      registeredAt: result.rows[0].registered_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get device by deviceId
 */
export async function getDevice(deviceIdHex) {
  const deviceIdBytes = Buffer.from(deviceIdHex.slice(2), 'hex');
  
  const query = `
    SELECT 
      id, device_id, device_wallet, manufacturer, model,
      serial_number, hardware_nonce, fingerprint, is_active,
      registered_at
    FROM devices
    WHERE device_id = $1
  `;
  
  const result = await pool.query(query, ['\\x' + deviceIdBytes.toString('hex')]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const device = result.rows[0];
  return {
    id: device.id,
    deviceId: '0x' + device.device_id.toString('hex').replace(/^00/, ''),
    deviceWallet: device.device_wallet,
    manufacturer: device.manufacturer,
    model: device.model,
    serialNumber: device.serial_number,
    hardwareNonce: device.hardware_nonce,
    fingerprint: '0x' + device.fingerprint.toString('hex').replace(/^00/, ''),
    isActive: device.is_active,
    registeredAt: device.registered_at
  };
}

/**
 * Get all devices
 */
export async function getAllDevices() {
  const query = `
    SELECT 
      id, device_id, device_wallet, manufacturer, model,
      serial_number, is_active, registered_at
    FROM devices
    ORDER BY registered_at DESC
  `;
  
  const result = await pool.query(query);
  
  return result.rows.map(device => ({
    id: device.id,
    deviceId: '0x' + device.device_id.toString('hex').replace(/^00/, ''),
    deviceWallet: device.device_wallet,
    manufacturer: device.manufacturer,
    model: device.model,
    serialNumber: device.serial_number,
    isActive: device.is_active,
    registeredAt: device.registered_at
  }));
}

/**
 * Find device wallet by sensor_id or drone_id
 * For drones: computes deviceId from DJI + model + drone_id + hardware_nonce
 * For sensors: tries to find device by serial_number matching sensor_id
 * Returns device wallet if found, otherwise returns command center wallet
 */
export async function findDeviceWalletForSensorOrDrone(sensorId, droneId, droneModel) {
  const commandCenterWallet = process.env.COMMAND_CENTER_WALLET || '0x23e224b79344d96fc00Ce7BdE1D5552d720a027b';
  
  try {
    if (droneId && droneModel) {
      // For drones: compute deviceId and look up device
      const { computeDeviceId } = await import('../utils/canonicalize.js');
      // Try common hardware nonces used for drones
      const hardwareNonces = ['HW003', 'HW001', 'HW002'];
      
      for (const hwNonce of hardwareNonces) {
        const deviceIdHex = computeDeviceId('DJI', droneModel, droneId, hwNonce);
        const device = await getDevice(deviceIdHex);
        if (device && device.isActive) {
          return { deviceWallet: device.deviceWallet, deviceId: deviceIdHex };
        }
      }
      
      // Also try looking up by serial_number matching drone_id
      const query = `
        SELECT device_wallet, device_id
        FROM devices
        WHERE serial_number = $1 AND manufacturer = 'DJI' AND is_active = true
        LIMIT 1
      `;
      const result = await pool.query(query, [droneId]);
      if (result.rows.length > 0) {
        const deviceId = '0x' + result.rows[0].device_id.toString('hex').replace(/^00/, '');
        return { deviceWallet: result.rows[0].device_wallet, deviceId };
      }
    }
    
    if (sensorId) {
      // For sensors: try to find device by serial_number matching sensor_id
      const query = `
        SELECT device_wallet, device_id
        FROM devices
        WHERE serial_number = $1 AND is_active = true
        LIMIT 1
      `;
      const result = await pool.query(query, [sensorId]);
      if (result.rows.length > 0) {
        const deviceId = '0x' + result.rows[0].device_id.toString('hex').replace(/^00/, '');
        return { deviceWallet: result.rows[0].device_wallet, deviceId };
      }
    }
  } catch (error) {
    console.error('Error finding device wallet:', error);
  }
  
  // Fallback to command center wallet
  return { deviceWallet: commandCenterWallet, deviceId: '0x0000000000000000000000000000000000000000000000000000000000000000' };
}

/**
 * Set device active/inactive status
 */
export async function setDeviceStatus(deviceIdHex, isActive) {
  const deviceIdBytes = Buffer.from(deviceIdHex.slice(2), 'hex');
  
  const query = `
    UPDATE devices
    SET is_active = $1
    WHERE device_id = $2
    RETURNING id, device_wallet
  `;
  
  const result = await pool.query(query, [isActive, '\\x' + deviceIdBytes.toString('hex')]);
  
  if (result.rows.length === 0) {
    throw new Error('Device not found');
  }
  
  // Update on-chain
  try {
    const { setDeviceStatusOnChain } = require('../blockchain/index.js');
    await setDeviceStatusOnChain(deviceIdHex, isActive);
  } catch (blockchainError) {
    console.error('Failed to update device status on-chain:', blockchainError.message);
  }
  
  return {
    deviceId: deviceIdHex,
    isActive,
    deviceWallet: result.rows[0].device_wallet
  };
}

