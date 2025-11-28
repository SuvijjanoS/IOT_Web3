# Quick Reference Guide

## 🚀 Common Commands

### Installation
```bash
npm run install:all                    # Install all dependencies
cd contracts && npm install            # Install contract dependencies only
cd backend && npm install              # Install backend dependencies only
cd frontend && npm install            # Install frontend dependencies only
```

### Database
```bash
createdb iot_web3                      # Create database
cd backend && npm run db:migrate       # Run migrations
psql -d iot_web3 -c "SELECT COUNT(*) FROM water_readings;"  # Check data
```

### Smart Contracts
```bash
cd contracts
npm run compile                        # Compile contracts
npm run deploy:sepolia                 # Deploy to Sepolia
npm run deploy:local                   # Deploy to local network
```

### Development Servers
```bash
# Backend (Terminal 1)
cd backend && npm run dev

# Frontend (Terminal 2)
cd frontend && npm run dev

# MQTT Simulator (Terminal 3, optional)
cd mqtt-simulator && npm start
```

### Docker
```bash
docker-compose up -d                   # Start all services
docker-compose down                    # Stop all services
docker-compose logs -f backend         # View backend logs
```

## 🔗 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Etherscan Sepolia**: https://sepolia.etherscan.io/

## 📡 MQTT Topics

- **Sensor Data**: `water/quality/{sensor_id}`
- **Control Commands**: `water/control/{sensor_id}`

## 🔧 Environment Variables

### Backend (.env)
```bash
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_web3
DB_USER=postgres
DB_PASSWORD=postgres
MQTT_BROKER_URL=mqtt://localhost:1883
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=your_private_key
```

### Contracts (.env)
```bash
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_private_key
```

## 📊 API Endpoints

```bash
# Get all sensors
GET /api/sensors

# Get readings for a sensor
GET /api/readings/:sensorId?limit=100&offset=0

# Send control command
POST /api/control
Body: { sensor_id, relay_id, state, duration_sec }

# Get command history
GET /api/control/history/:sensorId?limit=50
```

## 🐛 Troubleshooting

### Database Connection Failed
```bash
pg_isready                            # Check PostgreSQL status
psql -U postgres -l                   # List databases
```

### MQTT Connection Failed
```bash
mosquitto_pub -h localhost -t test -m "test"  # Test publish
mosquitto_sub -h localhost -t "#"             # Test subscribe
```

### Blockchain Transaction Failed
- Check Sepolia RPC URL
- Verify wallet has testnet ETH
- Check contract address in backend/.env
- View on Etherscan: https://sepolia.etherscan.io/

## 📝 Sample Sensor Data

```json
{
  "sensor_id": "sensor_wq_001",
  "ts": "2025-11-28T10:00:00Z",
  "location": { "lat": 13.7563, "lng": 100.5018 },
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

## 🎯 Sample Control Command

```json
{
  "sensor_id": "sensor_wq_001",
  "relay_id": "pump_1",
  "state": "ON",
  "duration_sec": 600
}
```

## 📚 Documentation Files

- `README.md` - Main documentation
- `SETUP.md` - Detailed setup guide
- `DEPLOYMENT.md` - Production deployment
- `QUICK_REFERENCE.md` - This file

