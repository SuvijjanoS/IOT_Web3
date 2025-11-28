import express from 'express';
import { processSensorReading, getReadings, getAllSensors } from '../services/sensorService.js';
import { sendControlCommand, getControlHistory } from '../services/controlService.js';

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

export default router;

