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

export default router;

