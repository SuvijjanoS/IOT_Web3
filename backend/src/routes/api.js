import express from 'express';
import { processSensorReading, getReadings, getAllSensors } from '../services/sensorService.js';
import { sendControlCommand, getControlHistory } from '../services/controlService.js';
import { 
  processDroneFlightLog, 
  getDroneFlights, 
  getFlightById, 
  getFlightsByDroneId,
  getAllDrones 
} from '../services/droneFlightService.js';
import { registerDevice, getDevice, getAllDevices, setDeviceStatus } from '../services/deviceService.js';
import { processDeviceLog, processCommandLog, verifyLog } from '../services/logTokenService.js';

const router = express.Router();

// Get all sensors
router.get('/sensors', async (req, res) => {
  try {
    const sensors = await getAllSensors();
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ error: 'Failed to fetch sensors' });
  }
});

// Get readings for a specific sensor
router.get('/readings/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const readings = await getReadings(sensorId, limit, offset);
    res.json(readings);
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// Send control command
router.post('/control', async (req, res) => {
  try {
    const { sensor_id, relay_id, state, duration_sec } = req.body;
    
    if (!sensor_id || !relay_id || !state) {
      return res.status(400).json({ 
        error: 'Missing required fields: sensor_id, relay_id, state' 
      });
    }
    
    const duration = duration_sec || 0;
    const result = await sendControlCommand(sensor_id, relay_id, state, duration);
    
    res.json({
      success: true,
      command: result
    });
  } catch (error) {
    console.error('Error sending control command:', error);
    res.status(500).json({ error: 'Failed to send control command' });
  }
});

// Get control command history
router.get('/control/history/:sensorId', async (req, res) => {
  try {
    const { sensorId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await getControlHistory(sensorId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching control history:', error);
    res.status(500).json({ error: 'Failed to fetch control history' });
  }
});

// ===== WATER QUALITY SENSOR READINGS API =====

// POST endpoint for sensor readings (alternative to MQTT)
router.post('/v1/sensor-readings', async (req, res) => {
  try {
    const data = req.body;
    const sensorId = data.sensor_id || 'unknown';
    const topic = `water/quality/${sensorId}`;
    
    const readingId = await processSensorReading(topic, data);
    
    res.status(201).json({
      success: true,
      reading_id: readingId,
      sensor_id: sensorId
    });
  } catch (error) {
    console.error('Error processing sensor reading:', error);
    res.status(500).json({ 
      error: 'Failed to process sensor reading',
      message: error.message 
    });
  }
});

// ===== DRONE FLIGHT LOGS API =====

// Ingest a drone flight log
router.post('/v1/drone-logs', async (req, res) => {
  try {
    const flightLog = req.body;
    
    if (!flightLog.flight_id || !flightLog.drone_id || !flightLog.drone_model) {
      return res.status(400).json({ 
        error: 'Missing required fields: flight_id, drone_id, drone_model' 
      });
    }
    
    const result = await processDroneFlightLog(flightLog);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error processing drone flight log:', error);
    res.status(500).json({ 
      error: 'Failed to process drone flight log',
      message: error.message 
    });
  }
});

// Get all drone flights
router.get('/drone-flights', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const flights = await getDroneFlights(limit, offset);
    res.json(flights);
  } catch (error) {
    console.error('Error fetching drone flights:', error);
    res.status(500).json({ error: 'Failed to fetch drone flights' });
  }
});

// Get all drones
router.get('/drones', async (req, res) => {
  try {
    const drones = await getAllDrones();
    res.json(drones);
  } catch (error) {
    console.error('Error fetching drones:', error);
    res.status(500).json({ error: 'Failed to fetch drones' });
  }
});

// Get a specific flight by flight_id
router.get('/drone-flights/:flightId', async (req, res) => {
  try {
    const { flightId } = req.params;
    const flight = await getFlightById(flightId);
    
    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }
    
    // Convert log_hash buffer to hex string if needed
    if (flight.log_hash && Buffer.isBuffer(flight.log_hash)) {
      flight.log_hash = '0x' + flight.log_hash.toString('hex');
    }
    
    res.json(flight);
  } catch (error) {
    console.error('Error fetching flight:', error);
    res.status(500).json({ error: 'Failed to fetch flight' });
  }
});

// Get flights for a specific drone
router.get('/drones/:droneId/flights', async (req, res) => {
  try {
    const { droneId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const flights = await getFlightsByDroneId(droneId, limit);
    res.json(flights);
  } catch (error) {
    console.error('Error fetching drone flights:', error);
    res.status(500).json({ error: 'Failed to fetch drone flights' });
  }
});

// Device Registry Endpoints
// Register a new device
router.post('/devices', async (req, res) => {
  try {
    const { manufacturer, model, serial_number, hardware_nonce, device_wallet } = req.body;
    
    if (!manufacturer || !model || !serial_number || !hardware_nonce) {
      return res.status(400).json({
        error: 'Missing required fields: manufacturer, model, serial_number, hardware_nonce'
      });
    }
    
    const device = await registerDevice({
      manufacturer,
      model,
      serialNumber: serial_number,
      hardwareNonce: hardware_nonce,
      deviceWallet: device_wallet
    });
    
    res.status(201).json(device);
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Failed to register device', message: error.message });
  }
});

// Get all devices
router.get('/devices', async (req, res) => {
  try {
    const devices = await getAllDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get device by ID
router.get('/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Set device status
router.patch('/devices/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { is_active } = req.body;
    
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }
    
    const result = await setDeviceStatus(deviceId, is_active);
    res.json(result);
  } catch (error) {
    console.error('Error updating device status:', error);
    res.status(500).json({ error: 'Failed to update device status', message: error.message });
  }
});

// Device Log Endpoints
// Submit device log for tokenization
router.post('/device-logs', async (req, res) => {
  try {
    const { device_id, log_entries, uri } = req.body;
    
    if (!device_id || !log_entries || !Array.isArray(log_entries) || log_entries.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: device_id, log_entries (non-empty array)'
      });
    }
    
    const result = await processDeviceLog(device_id, log_entries, uri || '');
    res.status(201).json(result);
  } catch (error) {
    console.error('Error processing device log:', error);
    res.status(500).json({ error: 'Failed to process device log', message: error.message });
  }
});

// Command Log Endpoints
// Submit command log for tokenization
router.post('/command-logs', async (req, res) => {
  try {
    const { command_center_wallet, device_id, command_entries, uri } = req.body;
    
    if (!command_center_wallet || !command_entries || !Array.isArray(command_entries) || command_entries.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: command_center_wallet, command_entries (non-empty array)'
      });
    }
    
    const result = await processCommandLog(
      command_center_wallet,
      device_id || null,
      command_entries,
      uri || ''
    );
    res.status(201).json(result);
  } catch (error) {
    console.error('Error processing command log:', error);
    res.status(500).json({ error: 'Failed to process command log', message: error.message });
  }
});

// Verification Endpoint
// Verify a log file by re-hashing and checking for matching token
router.post('/verify-log', async (req, res) => {
  try {
    const { log_entries, is_command_log } = req.body;
    
    if (!log_entries || !Array.isArray(log_entries) || log_entries.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: log_entries (non-empty array)'
      });
    }
    
    const result = await verifyLog(log_entries, is_command_log || false);
    res.json(result);
  } catch (error) {
    console.error('Error verifying log:', error);
    res.status(500).json({ error: 'Failed to verify log', message: error.message });
  }
});

export default router;

