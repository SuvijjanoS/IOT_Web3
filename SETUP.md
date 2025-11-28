# Setup Guide

Step-by-step instructions to get the IoT Web3 Water Quality Monitoring System running.

## Prerequisites Installation

### 1. Node.js and npm
```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

### 2. PostgreSQL
```bash
# macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### 3. MQTT Broker

#### Option A: Mosquitto (Lightweight)
```bash
# macOS
brew install mosquitto
brew services start mosquitto

# Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# Windows
# Download from https://mosquitto.org/download/
```

#### Option B: EMQX (Production-ready)
```bash
# Using Docker
docker run -d --name emqx -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 18083:18083 emqx/emqx:latest

# Or download from https://www.emqx.io/downloads
```

### 4. Ethereum Wallet Setup

1. Install MetaMask browser extension
2. Add Sepolia testnet network:
   - Network Name: Sepolia
   - RPC URL: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   - Chain ID: 11155111
   - Currency Symbol: ETH
3. Get testnet ETH from a faucet:
   - https://sepoliafaucet.com/
   - https://faucet.quicknode.com/ethereum/sepolia

## Project Setup

### Step 1: Clone and Install Dependencies

```bash
cd IOT_Web3
npm install
cd contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Step 2: Database Setup

```bash
# Create database
createdb iot_web3

# Or using psql
psql -U postgres
CREATE DATABASE iot_web3;
\q

# Run migrations
cd backend
npm run db:migrate
cd ..
```

### Step 3: Configure Environment Variables

#### Contracts Configuration
```bash
cd contracts
cp .env.example .env
# Edit .env with:
# - SEPOLIA_RPC_URL (from Infura or Alchemy)
# - PRIVATE_KEY (your wallet private key - NEVER commit this!)
```

#### Backend Configuration
```bash
cd backend
cp .env.example .env
# Edit .env with:
# - Database credentials
# - MQTT broker URL
# - Sepolia RPC URL
# - Contract address (after deployment)
# - Private key
```

#### MQTT Simulator Configuration
```bash
cd mqtt-simulator
cp .env.example .env
# Edit .env with:
# - MQTT_BROKER_URL
# - SENSOR_ID (optional, defaults to sensor_wq_001)
```

### Step 4: Deploy Smart Contract

```bash
cd contracts

# Compile contract
npm run compile

# Deploy to Sepolia
npm run deploy:sepolia

# Copy the deployed contract address
# Add it to backend/.env as CONTRACT_ADDRESS
```

### Step 5: Start Services

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

#### Terminal 3: MQTT Simulator (Optional)
```bash
cd mqtt-simulator
npm start
```

### Step 6: Verify Installation

1. **Backend Health Check**: http://localhost:3001/health
2. **Frontend**: http://localhost:3000
3. **Check MQTT**: 
   ```bash
   mosquitto_sub -h localhost -t "water/quality/#"
   ```
4. **Check Database**:
   ```bash
   psql -d iot_web3 -c "SELECT COUNT(*) FROM water_readings;"
   ```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `backend/.env`
- Ensure database exists: `psql -l | grep iot_web3`

### MQTT Connection Issues
- Verify broker is running: `mosquitto_pub -h localhost -t test -m "test"`
- Check MQTT_BROKER_URL in backend/.env
- For Mosquitto, check it's listening: `netstat -an | grep 1883`

### Blockchain Issues
- Verify Sepolia RPC URL is correct
- Check wallet has testnet ETH
- Verify contract address matches deployed contract
- Check transaction on Etherscan: https://sepolia.etherscan.io/

### Frontend Can't Connect to Backend
- Verify backend is running on port 3001
- Check CORS settings in backend
- Verify API URL in frontend/vite.config.js

## Next Steps

1. **Add Real Sensors**: Connect your actual IoT devices to MQTT broker
2. **Customize Dashboards**: Modify React components for your needs
3. **Set Up Alerts**: Add notification system for critical readings
4. **Deploy to Production**: Follow DEPLOYMENT.md guide

## Development Tips

- Use `npm run dev` in backend for auto-reload
- Frontend hot-reloads automatically with Vite
- Check browser console for frontend errors
- Check backend terminal for API logs
- Use MQTT Explorer or similar tools to monitor MQTT traffic

