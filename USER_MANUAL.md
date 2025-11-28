# User Manual - IoT Web3 Water Quality Monitoring System

This manual will guide you through setting up, running, and using the IoT Web3 Water Quality Monitoring System on your local machine.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [Starting the System](#starting-the-system)
5. [Using the Dashboards](#using-the-dashboards)
6. [Testing the System](#testing-the-system)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js 18 or higher**
   - Check version: `node -v`
   - Download from: https://nodejs.org/

2. **PostgreSQL Database**
   - Check if installed: `psql --version`
   - macOS: `brew install postgresql@15`
   - Ubuntu/Debian: `sudo apt-get install postgresql`
   - Windows: Download from https://www.postgresql.org/download/

3. **MQTT Broker** (choose one)
   - **Mosquitto** (lightweight, recommended for testing):
     - macOS: `brew install mosquitto`
     - Ubuntu: `sudo apt-get install mosquitto mosquitto-clients`
   - **EMQX** (production-ready):
     - Docker: `docker run -d --name emqx -p 1883:1883 emqx/emqx:latest`

4. **Git** (for cloning the repository)

### Optional but Recommended

- **MetaMask** browser extension (for viewing blockchain transactions)
- **Postman** or **curl** (for API testing)

---

## Initial Setup

### Step 1: Clone or Navigate to the Project

If you haven't already:

```bash
cd /Users/ss/IOT_Web3
```

### Step 2: Install Dependencies

Run the setup script (recommended):

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Or install manually:

```bash
# Install root dependencies
npm install

# Install contract dependencies
cd contracts && npm install && cd ..

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install MQTT simulator dependencies
cd mqtt-simulator && npm install && cd ..
```

### Step 3: Set Up PostgreSQL Database

```bash
# Create the database
createdb iot_web3

# Verify it was created
psql -l | grep iot_web3
```

If you get a "command not found" error, make sure PostgreSQL is running:

```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql
```

### Step 4: Run Database Migrations

```bash
cd backend
npm run db:migrate
cd ..
```

You should see: `Database schema created successfully`

---

## Configuration

### Step 1: Configure Backend

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `backend/.env` with your settings:
   ```bash
   # Open in your preferred editor
   nano .env
   # or
   code .env
   ```

3. Update these values (minimum required):
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=iot_web3
   DB_USER=postgres
   DB_PASSWORD=postgres
   MQTT_BROKER_URL=mqtt://localhost:1883
   ```

   **Note**: For local testing without blockchain, you can leave blockchain settings empty. The system will work but won't record on-chain.

### Step 2: Configure MQTT Simulator (Optional)

```bash
cd mqtt-simulator
cp .env.example .env
```

Edit `mqtt-simulator/.env`:
```env
MQTT_BROKER_URL=mqtt://localhost:1883
SENSOR_ID=sensor_wq_001
```

### Step 3: Configure Blockchain (Optional for Testing)

If you want to test blockchain features:

1. **Get Sepolia Testnet ETH**:
   - Install MetaMask browser extension
   - Add Sepolia testnet network
   - Get free testnet ETH from: https://sepoliafaucet.com/

2. **Get Infura/Alchemy RPC URL**:
   - Sign up at https://infura.io/ or https://www.alchemy.com/
   - Create a new project for Sepolia network
   - Copy the RPC URL

3. **Configure Contracts**:
   ```bash
   cd contracts
   cp .env.example .env
   ```

   Edit `contracts/.env`:
   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   PRIVATE_KEY=your_wallet_private_key_here
   ```

4. **Deploy Smart Contract**:
   ```bash
   cd contracts
   npm run compile
   npm run deploy:sepolia
   ```

   Copy the deployed contract address and add it to `backend/.env`:
   ```env
   CONTRACT_ADDRESS=0x...
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   PRIVATE_KEY=your_wallet_private_key_here
   ```

---

## Starting the System

You'll need **3 terminal windows** to run all components.

### Terminal 1: Start MQTT Broker

**If using Mosquitto:**

```bash
# Start Mosquitto (macOS with Homebrew)
brew services start mosquitto

# Or run directly
mosquitto -c /opt/homebrew/etc/mosquitto/mosquitto.conf

# Verify it's running
mosquitto_sub -h localhost -t "test" -v
# (Press Ctrl+C to exit)
```

**If using EMQX with Docker:**

```bash
docker run -d --name emqx -p 1883:1883 -p 8083:8083 -p 18083:18083 emqx/emqx:latest
```

**Verify MQTT is working:**

Open a new terminal and test:
```bash
# Subscribe to test topic
mosquitto_sub -h localhost -t "test" -v

# In another terminal, publish a test message
mosquitto_pub -h localhost -t "test" -m "Hello MQTT"
```

You should see "Hello MQTT" appear in the subscriber terminal.

### Terminal 2: Start Backend API Server

```bash
cd /Users/ss/IOT_Web3/backend
npm run dev
```

**Expected output:**
```
Backend server running on http://localhost:3001
Health check: http://localhost:3001/health
Connected to MQTT broker: mqtt://localhost:1883
Subscribed to sensor topic: water/quality/+
```

**Verify backend is running:**
- Open browser: http://localhost:3001/health
- Should see: `{"status":"ok","timestamp":"..."}`

### Terminal 3: Start Frontend

```bash
cd /Users/ss/IOT_Web3/frontend
npm run dev
```

**Expected output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Open the application:**
- Browser: http://localhost:3000

### Terminal 4 (Optional): Start MQTT Simulator

This will generate test sensor data:

```bash
cd /Users/ss/IOT_Web3/mqtt-simulator
npm start
```

**Expected output:**
```
Connected to MQTT broker: mqtt://localhost:1883
Publishing sensor data for: sensor_wq_001
Publishing sample readings...
Published reading 1/5
Published reading 2/5
...
Starting continuous simulation...
```

---

## Using the Dashboards

### Accessing the Application

1. Open your web browser
2. Navigate to: **http://localhost:3000**

You'll see the main navigation with two options:
- **Data Dashboard** (default)
- **Control Panel**

---

### Data Dashboard

**Purpose**: View sensor readings over time with blockchain verification links.

#### Viewing Sensor Data

1. **Select a Sensor**:
   - Use the dropdown at the top to select a sensor
   - If you just started, select `sensor_wq_001` (from simulator)

2. **Select a Parameter**:
   - Choose what to visualize: Turbidity, pH, Temperature, TDS, Dissolved Oxygen, or Battery
   - Default is Turbidity (NTU)

3. **View the Chart**:
   - The chart shows readings over time
   - Each point represents a sensor reading
   - Hover over points to see values

#### Viewing Reading Details

1. **Click on any data point** in the chart
2. A side panel will open showing:
   - **Sensor Data**: All parameters (pH, temperature, turbidity, etc.)
   - **Blockchain Verification**: Link to Etherscan (if blockchain is enabled)
   - **Raw JSON**: Complete sensor message

3. **Verify on Blockchain**:
   - Click "View on Etherscan" link
   - Opens Sepolia Etherscan showing the transaction
   - Verify the data hash matches

#### Understanding the Data

- **pH**: Water acidity (7.0 is neutral, <7 is acidic, >7 is basic)
- **Temperature**: Water temperature in Celsius
- **Turbidity**: Water clarity (lower is clearer, >10 NTU may indicate contamination)
- **TDS**: Total Dissolved Solids (mg/L)
- **Dissolved Oxygen**: Oxygen level in water (mg/L)
- **Battery**: Sensor battery percentage
- **Status**: "OK" or "ALERT_TURBIDITY" (or other alerts)

---

### Control Panel

**Purpose**: Send ON/OFF commands to IoT devices (pumps, valves, etc.)

#### Sending a Control Command

1. **Select Sensor/Device**:
   - Choose the sensor/device you want to control
   - Example: `sensor_wq_001`

2. **Enter Relay/Actuator ID**:
   - Type the ID of the device to control
   - Examples: `pump_1`, `valve_1`, `filter_1`

3. **Select State**:
   - Choose **ON** or **OFF**

4. **Set Duration** (optional):
   - Enter duration in seconds
   - Example: `600` = 10 minutes
   - `0` = no automatic toggle (stays ON/OFF until manually changed)

5. **Send Command**:
   - Click the **"Turn ON"** or **"Turn OFF"** button
   - You'll see a success message

#### Understanding Command History

- The history table shows all commands sent
- Each command includes:
  - **Time**: When the command was sent
  - **Relay ID**: Which device was controlled
  - **State**: ON or OFF
  - **Duration**: How long the device should stay in that state
  - **Blockchain**: Link to verify the command on-chain

#### How Commands Work

1. Command is sent via MQTT to topic: `water/control/{sensor_id}`
2. Your IoT device should subscribe to this topic
3. Device receives JSON:
   ```json
   {
     "command": "SET_RELAY",
     "relay_id": "pump_1",
     "state": "ON",
     "duration_sec": 600
   }
   ```
4. Device turns ON and sets a timer for 600 seconds
5. After 600 seconds, device automatically turns OFF

---

## Testing the System

### Test 1: Verify Backend is Running

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Test 2: Check Database Connection

```bash
psql -d iot_web3 -c "SELECT COUNT(*) FROM water_readings;"
```

Should return a number (0 if no data yet).

### Test 3: Verify MQTT is Working

**Terminal A** (subscribe):
```bash
mosquitto_sub -h localhost -t "water/quality/#" -v
```

**Terminal B** (publish test):
```bash
mosquitto_pub -h localhost -t "water/quality/test_sensor" -m '{"sensor_id":"test_sensor","ts":"2025-01-01T00:00:00Z","parameters":{"ph":7.0},"status":"OK"}'
```

You should see the message in Terminal A.

### Test 4: Generate Test Data

1. Start the MQTT simulator (Terminal 4)
2. Wait 10-15 seconds
3. Refresh the Data Dashboard
4. You should see sensor readings appear

### Test 5: Test API Endpoints

**Get all sensors:**
```bash
curl http://localhost:3001/api/sensors
```

**Get readings for a sensor:**
```bash
curl http://localhost:3001/api/readings/sensor_wq_001
```

**Send a control command:**
```bash
curl -X POST http://localhost:3001/api/control \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "sensor_wq_001",
    "relay_id": "pump_1",
    "state": "ON",
    "duration_sec": 60
  }'
```

### Test 6: Verify Blockchain Integration

1. Ensure blockchain is configured (see Configuration section)
2. Send some sensor data via MQTT simulator
3. Check backend terminal for: `Recorded reading X on-chain: 0x...`
4. Click on a data point in the dashboard
5. Click "View on Etherscan" link
6. Verify the transaction exists on Sepolia

---

## Troubleshooting

### Problem: Backend won't start

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**: PostgreSQL is not running
```bash
# macOS
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Verify
pg_isready
```

---

### Problem: MQTT connection failed

**Error**: `MQTT error: connect ECONNREFUSED`

**Solution**: MQTT broker is not running
```bash
# Check if Mosquitto is running
brew services list | grep mosquitto

# Start Mosquitto
brew services start mosquitto

# Or test connection
mosquitto_pub -h localhost -t "test" -m "test"
```

---

### Problem: No data appearing in dashboard

**Checklist**:
1. ✅ MQTT broker is running
2. ✅ Backend is connected to MQTT (check backend terminal)
3. ✅ MQTT simulator is publishing (or real sensor is connected)
4. ✅ Database has data: `psql -d iot_web3 -c "SELECT COUNT(*) FROM water_readings;"`
5. ✅ Frontend is connected to backend (check browser console)

**Debug steps**:
```bash
# Check if messages are being received
mosquitto_sub -h localhost -t "water/quality/#" -v

# Check database
psql -d iot_web3 -c "SELECT sensor_id, ts, status FROM water_readings ORDER BY ts DESC LIMIT 5;"

# Check backend logs for errors
# Look in Terminal 2 (backend)
```

---

### Problem: Blockchain transactions failing

**Error**: `Failed to record on blockchain`

**Solutions**:
1. Check Sepolia RPC URL is correct in `backend/.env`
2. Verify wallet has Sepolia testnet ETH
3. Check contract address is correct
4. View error details in backend terminal

**Test blockchain connection**:
```bash
# In backend directory, create a test file
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
provider.getBlockNumber().then(console.log).catch(console.error);
"
```

---

### Problem: Frontend can't connect to backend

**Error**: `Network Error` or `CORS error`

**Solutions**:
1. Verify backend is running on port 3001
2. Check `frontend/vite.config.js` has correct proxy settings
3. Check browser console for specific errors
4. Try accessing backend directly: http://localhost:3001/health

---

### Problem: Database migration fails

**Error**: `relation "water_readings" already exists`

**Solution**: Database already has tables. This is OK, you can continue.

**To reset database** (⚠️ deletes all data):
```bash
psql -d iot_web3 -c "DROP TABLE IF EXISTS control_commands, water_readings CASCADE;"
cd backend && npm run db:migrate
```

---

### Problem: Port already in use

**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**: Another process is using the port
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port in backend/.env
PORT=3002
```

---

## Quick Reference

### Start Everything (4 terminals)

```bash
# Terminal 1: MQTT Broker
brew services start mosquitto  # or docker run emqx

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend  
cd frontend && npm run dev

# Terminal 4: Simulator (optional)
cd mqtt-simulator && npm start
```

### Stop Everything

```bash
# Stop backend: Ctrl+C in Terminal 2
# Stop frontend: Ctrl+C in Terminal 3
# Stop simulator: Ctrl+C in Terminal 4
# Stop MQTT: brew services stop mosquitto
```

### Check System Status

```bash
# Backend health
curl http://localhost:3001/health

# Database
psql -d iot_web3 -c "SELECT COUNT(*) FROM water_readings;"

# MQTT
mosquitto_pub -h localhost -t "test" -m "test"
```

---

## Next Steps

Once you have the system running locally:

1. **Connect Real Sensors**: Replace simulator with actual IoT devices
2. **Customize Dashboards**: Modify React components for your needs
3. **Set Up Alerts**: Add notification system for critical readings
4. **Deploy to Production**: Follow `DEPLOYMENT.md` guide
5. **Add Features**: See `PROJECT_SUMMARY.md` for ideas

---

## Getting Help

- **Documentation**: Check `README.md`, `SETUP.md`, `DEPLOYMENT.md`
- **Issues**: Check backend/frontend terminal logs
- **Database**: Use `psql -d iot_web3` to inspect data
- **MQTT**: Use `mosquitto_sub` to monitor messages

---

## Summary

You now know how to:
- ✅ Set up the development environment
- ✅ Configure all components
- ✅ Start all services
- ✅ Use the Data Dashboard
- ✅ Use the Control Panel
- ✅ Test the system
- ✅ Troubleshoot common issues

Happy monitoring! 🌊

