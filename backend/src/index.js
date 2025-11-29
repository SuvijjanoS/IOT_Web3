import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initializeMQTT } from './mqtt/index.js';
import { initializeBlockchain } from './blockchain/index.js';
import { processSensorReading } from './services/sensorService.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize MQTT
initializeMQTT(async (topic, data) => {
  try {
    await processSensorReading(topic, data);
  } catch (error) {
    console.error('Error processing MQTT message:', error);
  }
});

// Initialize Blockchain
const blockchainEnabled = initializeBlockchain();
if (!blockchainEnabled) {
  console.warn('Blockchain features disabled. Set SEPOLIA_RPC_URL, CONTRACT_ADDRESS, and PRIVATE_KEY to enable.');
}

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

