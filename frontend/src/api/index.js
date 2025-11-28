import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSensors = () => api.get('/sensors');
export const getReadings = (sensorId, limit = 100, offset = 0) =>
  api.get(`/readings/${sensorId}`, { params: { limit, offset } });
export const sendControlCommand = (sensorId, relayId, state, durationSec) =>
  api.post('/control', { sensor_id: sensorId, relay_id: relayId, state, duration_sec: durationSec });
export const getControlHistory = (sensorId, limit = 50) =>
  api.get(`/control/history/${sensorId}`, { params: { limit } });

export default api;

