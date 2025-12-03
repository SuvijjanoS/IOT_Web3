import axios from 'axios';

// Use relative path if VITE_API_URL is '/api', otherwise use the env var or default
const API_BASE_URL = import.meta.env.VITE_API_URL === '/api' 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSensors = () => api.get('/sensors');
export const getReadings = (sensorId, limit = 100, offset = 0) =>
  api.get(`/readings/${sensorId}`, { params: { limit, offset } });
export const getDatapoints = (sensorId, parameterName, limit = 1000, offset = 0) =>
  api.get(`/datapoints/${sensorId}/${parameterName}`, { params: { limit, offset } });
export const getAllDatapoints = (sensorId, limit = 1000, offset = 0) =>
  api.get(`/datapoints/${sensorId}`, { params: { limit, offset } });
export const sendControlCommand = (sensorId, relayId, state, durationSec) =>
  api.post('/control', { sensor_id: sensorId, relay_id: relayId, state, duration_sec: durationSec });
export const getControlHistory = (sensorId, limit = 50) =>
  api.get(`/control/history/${sensorId}`, { params: { limit } });

// Drone Flight APIs
export const submitDroneFlightLog = (flightLog) => api.post('/v1/drone-logs', flightLog);
export const getDroneFlights = (limit = 50, offset = 0) =>
  api.get('/drone-flights', { params: { limit, offset } });
export const getFlightById = (flightId) => api.get(`/drone-flights/${flightId}`);
export const getAllDrones = () => api.get('/drones');
export const getFlightsByDroneId = (droneId, limit = 50) =>
  api.get(`/drones/${droneId}/flights`, { params: { limit } });

// Device Management APIs
export const getAllDevices = () => api.get('/devices');
export const getDevice = (deviceId) => api.get(`/devices/${deviceId}`);
export const registerDevice = (deviceData) => api.post('/devices', deviceData);

export default api;

