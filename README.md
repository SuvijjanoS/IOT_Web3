# IoT Web3 Water Quality Monitoring System

A complete industrial IoT + Web3 system for monitoring water quality sensors with blockchain-based data integrity verification and device control capabilities.

## 🌊 Features

- **Real-time Sensor Data**: MQTT-based ingestion of water quality sensor readings (pH, temperature, turbidity, TDS, dissolved oxygen)
- **Blockchain Verification**: All sensor readings are hashed and recorded on Ethereum Sepolia testnet for tamper-proof verification
- **Interactive Dashboards**: 
  - Data Dashboard: Time-series charts with click-through to blockchain transactions
  - Control Dashboard: Send ON/OFF commands with timers to IoT devices
- **MQTT Integration**: Supports EMQX or Mosquitto brokers
- **PostgreSQL Database**: Efficient storage of sensor readings and control commands
- **RESTful API**: Backend API for frontend integration

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Sensors   │────▶│  MQTT Broker │────▶│   Backend   │
│  (MQTT)     │     │  (EMQX/MQTT) │     │   (Node.js) │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                    ┌────────────┼────────────┐
                                    │            │            │
                              ┌─────▼───┐  ┌────▼────┐  ┌───▼────┐
                              │PostgreSQL│  │Ethereum │  │Frontend│
                              │ Database │  │ Sepolia │  │  React │
                              └──────────┘  └─────────┘  └────────┘
```

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 12+
- **MQTT Broker** (EMQX or Mosquitto)
- **Ethereum Wallet** with Sepolia testnet ETH (for blockchain features)

## 📖 Documentation

- **[USER_MANUAL.md](USER_MANUAL.md)** - **Start here!** Complete step-by-step guide for running and using the system locally
- **[DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md)** - **🚀 Quick Start** - Fast track to deploy to GitHub and servers
- **[GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md)** - **Deploy to GitHub** - Detailed guide to push code to GitHub
- **[SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md)** - **Deploy to Servers** - Complete guide for deploying to cloud platforms and servers
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Command cheat sheet

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd IOT_Web3
npm run install:all
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb iot_web3

# Run migrations
cd backend
npm run db:migrate
```

### 3. Configure Environment Variables

#### Contracts (.env in `contracts/` directory)
```bash
cp contracts/.env.example contracts/.env
# Edit contracts/.env with your Sepolia RPC URL and private key
```

#### Backend (.env in `backend/` directory)
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database, MQTT, and blockchain config
```

#### MQTT Simulator (.env in `mqtt-simulator/` directory)
```bash
cp mqtt-simulator/.env.example mqtt-simulator/.env
# Edit mqtt-simulator/.env with your MQTT broker URL
```

### 4. Deploy Smart Contract

```bash
cd contracts
npm run deploy:sepolia
# Copy the deployed contract address to backend/.env as CONTRACT_ADDRESS
```

### 5. Start Services

#### Terminal 1: Backend API
```bash
cd backend
npm run dev
```

#### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

#### Terminal 3: MQTT Simulator (optional, for testing)
```bash
cd mqtt-simulator
npm start
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📁 Project Structure

```
IOT_Web3/
├── contracts/          # Solidity smart contracts
│   ├── contracts/      # WaterQualityRegistry.sol
│   ├── scripts/        # Deployment scripts
│   └── hardhat.config.js
├── backend/            # Node.js API server
│   ├── src/
│   │   ├── db/         # Database schema and connection
│   │   ├── blockchain/ # Ethereum integration
│   │   ├── mqtt/       # MQTT client
│   │   ├── services/   # Business logic
│   │   └── routes/     # API routes
│   └── package.json
├── frontend/           # React application
│   ├── src/
│   │   ├── components/ # Dashboard components
│   │   └── api/        # API client
│   └── vite.config.js
├── mqtt-simulator/     # Sensor data simulator
└── README.md
```

## 🔧 Configuration

### MQTT Topics

- **Sensor Data**: `water/quality/{sensor_id}`
- **Control Commands**: `water/control/{sensor_id}`

### Smart Contract Functions

- `recordReading(sensorId, timestamp, dataHash)` - Record sensor reading hash
- `recordCommand(sensorId, relayId, command, timestamp, commandHash)` - Record control command hash
- `getReading(sensorId, timestamp)` - Retrieve reading hash

## 📊 API Endpoints

### Sensors
- `GET /api/sensors` - Get all sensors
- `GET /api/readings/:sensorId` - Get readings for a sensor
  - Query params: `limit`, `offset`

### Control
- `POST /api/control` - Send control command
  - Body: `{ sensor_id, relay_id, state, duration_sec }`
- `GET /api/control/history/:sensorId` - Get command history

## 🌐 Deployment

### Local Development
Follow the Quick Start guide above.

### Production Deployment

1. **Set up PostgreSQL** on your server or use a managed service
2. **Deploy MQTT Broker** (EMQX recommended for production)
3. **Deploy Backend**:
   ```bash
   cd backend
   npm install --production
   npm start
   ```
4. **Deploy Frontend**:
   ```bash
   cd frontend
   npm run build
   # Serve dist/ folder with nginx or similar
   ```
5. **Set Environment Variables** in production environment

### Docker Deployment (Coming Soon)

Docker compose files for easy deployment will be added in future updates.

## 🔐 Security Notes

- **Never commit** `.env` files or private keys to git
- Use environment variables for all sensitive configuration
- For production, use a secure key management system
- Ensure MQTT broker has authentication enabled
- Use HTTPS in production

## 🧪 Testing

### Test Sensor Data Format

The system expects sensor data in this JSON format:

```json
{
  "sensor_id": "sensor_wq_001",
  "ts": "2025-11-28T10:00:00Z",
  "location": {
    "lat": 13.7563,
    "lng": 100.5018
  },
  "parameters": {
    "ph": 7.2,
    "temperature_c": 27.5,
    "turbidity_ntu": 3.1,
    "tds_mg_l": 220,
    "dissolved_oxygen_mg_l": 6.8
  },
  "battery_pct": 89,
  "status": "OK"
}
```

### Test Control Command Format

```json
{
  "command": "SET_RELAY",
  "relay_id": "pump_1",
  "state": "ON",
  "duration_sec": 600
}
```

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on GitHub.

## 🎯 Roadmap

- [ ] Docker Compose setup
- [ ] ThingsBoard integration option
- [ ] IPFS integration for full data storage
- [ ] Multi-chain support
- [ ] Advanced analytics dashboard
- [ ] Alert system with notifications
- [ ] Mobile app

