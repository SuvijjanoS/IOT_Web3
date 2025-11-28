import React from 'react';
import { Link } from 'react-router-dom';
import './APIIntegrationGuide.css';

function APIIntegrationGuide() {
  return (
    <div className="api-integration-guide">
      <div className="guide-header">
        <h1>📡 API Integration Guide</h1>
        <p className="subtitle">Connect your sensors and devices to ingest data and tokenize on-chain</p>
      </div>

      <div className="guide-content">
        <section className="guide-section">
          <h2>Overview</h2>
          <p>
            This guide explains how to connect your IoT sensors and devices to our platform's API endpoints
            to automatically ingest data and record hashes on the Ethereum Sepolia testnet for tamper-proof verification.
          </p>
        </section>

        <section className="guide-section">
          <h2>🌊 Water Quality Sensor Integration</h2>
          
          <h3>API Endpoint</h3>
          <div className="code-block">
            <code>POST {window.location.origin}/api/v1/sensor-readings</code>
          </div>

          <h3>MQTT Topic (Alternative)</h3>
          <div className="code-block">
            <code>water/quality/{sensor_id}</code>
          </div>

          <h3>Data Format</h3>
          <div className="code-block">
            <pre>{`{
  "sensor_id": "sensor_wq_001",
  "ts": "2025-11-28T10:30:00Z",
  "parameters": {
    "ph": 7.2,
    "temperature_c": 25.5,
    "turbidity_ntu": 2.1,
    "tds_mg_l": 150,
    "dissolved_oxygen_mg_l": 8.5
  },
  "battery_pct": 95,
  "status": "OK",
  "location": {
    "lat": 13.756331,
    "lng": 100.501765
  }
}`}</pre>
          </div>

          <h3>Example: Python Script</h3>
          <div className="code-block">
            <pre>{`import requests
import json
from datetime import datetime

API_URL = "https://web3iot.dhammada.com/api/v1/sensor-readings"

def send_reading(sensor_id, ph, temp, turbidity, tds, do_level):
    data = {
        "sensor_id": sensor_id,
        "ts": datetime.utcnow().isoformat() + "Z",
        "parameters": {
            "ph": ph,
            "temperature_c": temp,
            "turbidity_ntu": turbidity,
            "tds_mg_l": tds,
            "dissolved_oxygen_mg_l": do_level
        },
        "battery_pct": 95,
        "status": "OK"
    }
    
    response = requests.post(API_URL, json=data)
    return response.json()

# Usage
result = send_reading("sensor_wq_001", 7.2, 25.5, 2.1, 150, 8.5)
print(result)`}</pre>
          </div>

          <h3>Example: Node.js Script</h3>
          <div className="code-block">
            <pre>{`const axios = require('axios');

const API_URL = 'https://web3iot.dhammada.com/api/v1/sensor-readings';

async function sendReading(sensorId, ph, temp, turbidity, tds, doLevel) {
  const data = {
    sensor_id: sensorId,
    ts: new Date().toISOString(),
    parameters: {
      ph: ph,
      temperature_c: temp,
      turbidity_ntu: turbidity,
      tds_mg_l: tds,
      dissolved_oxygen_mg_l: doLevel
    },
    battery_pct: 95,
    status: 'OK'
  };

  try {
    const response = await axios.post(API_URL, data);
    console.log('Reading sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
sendReading('sensor_wq_001', 7.2, 25.5, 2.1, 150, 8.5);`}</pre>
          </div>

          <h3>MQTT Integration</h3>
          <p>Publish sensor data to MQTT broker:</p>
          <div className="code-block">
            <pre>{`import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://152.42.239.238:1883');

client.on('connect', () => {
  const sensorId = 'sensor_wq_001';
  const topic = \`water/quality/\${sensorId}\`;
  
  const data = {
    sensor_id: sensorId,
    ts: new Date().toISOString(),
    parameters: {
      ph: 7.2,
      temperature_c: 25.5,
      turbidity_ntu: 2.1,
      tds_mg_l: 150,
      dissolved_oxygen_mg_l: 8.5
    },
    battery_pct: 95,
    status: 'OK'
  };
  
  client.publish(topic, JSON.stringify(data));
  client.end();
});`}</pre>
          </div>
        </section>

        <section className="guide-section">
          <h2>🛸 Drone Flight Log Integration</h2>
          
          <h3>API Endpoint</h3>
          <div className="code-block">
            <code>POST {window.location.origin}/api/v1/drone-logs</code>
          </div>

          <h3>Data Format</h3>
          <div className="code-block">
            <pre>{`{
  "flight_id": "FLIGHT_123",
  "drone_id": "MAVIC3_001",
  "drone_model": "DJI Mavic 3",
  "started_at_utc": "2025-11-28T06:20:00Z",
  "firmware_version": "01.01.1200",
  "app_name": "DJI Fly",
  "app_version": "1.15.0",
  "home_point": {
    "lat": 13.756331,
    "lon": 100.501765,
    "alt_asl_m": 2.5
  },
  "samples_hz": 10,
  "samples": [
    {
      "t_ms": 0,
      "lat": 13.756331,
      "lon": 100.501765,
      "height_agl_m": 0.2,
      "alt_asl_m": 2.7,
      "pitch_deg": 0.0,
      "roll_deg": 0.0,
      "yaw_deg": 0.0,
      "vx_ms": 0.0,
      "vy_ms": 0.0,
      "vz_ms": 0.0,
      "h_speed_ms": 0.0,
      "gps_level": 4,
      "gps_sats": 18,
      "flight_mode": "P-GPS",
      "rc_aileron_pct": 0.0,
      "rc_elevator_pct": 0.0,
      "rc_throttle_pct": 10.0,
      "rc_rudder_pct": 0.0,
      "battery_pct": 99,
      "battery_voltage_v": 15.9,
      "warnings": [],
      "event_flags": {
        "photo_taken": false,
        "video_rec": true,
        "rth_active": false
      }
    }
    // ... more samples
  ]
}`}</pre>
          </div>

          <h3>Example: Python Script</h3>
          <div className="code-block">
            <pre>{`import requests
import json
from datetime import datetime

API_URL = "https://web3iot.dhammada.com/api/v1/drone-logs"

def submit_flight_log(flight_id, drone_id, samples):
    data = {
        "flight_id": flight_id,
        "drone_id": drone_id,
        "drone_model": "DJI Mavic 3",
        "started_at_utc": datetime.utcnow().isoformat() + "Z",
        "samples_hz": 10,
        "samples": samples
    }
    
    response = requests.post(API_URL, json=data)
    return response.json()

# Usage
samples = [
    {
        "t_ms": 0,
        "lat": 13.756331,
        "lon": 100.501765,
        "height_agl_m": 0.2,
        # ... other fields
    }
]

result = submit_flight_log("FLIGHT_123", "MAVIC3_001", samples)
print(result)`}</pre>
          </div>
        </section>

        <section className="guide-section">
          <h2>🔗 Blockchain Tokenization</h2>
          
          <h3>Automatic Process</h3>
          <p>
            When you submit data via API, the system automatically:
          </p>
          <ol>
            <li><strong>Validates</strong> the data format</li>
            <li><strong>Stores</strong> data in PostgreSQL database</li>
            <li><strong>Computes</strong> SHA-256 hash (for water) or Keccak256 hash (for flights)</li>
            <li><strong>Records</strong> hash on Ethereum Sepolia testnet</li>
            <li><strong>Returns</strong> transaction hash and block number</li>
          </ol>

          <h3>Response Format</h3>
          <div className="code-block">
            <pre>{`{
  "flight_id": "FLIGHT_123",
  "log_hash": "a1b2c3d4...",
  "tokenization_status": "PENDING"
}`}</pre>
          </div>

          <h3>Verifying On-Chain</h3>
          <p>After submission, you can verify the data on-chain:</p>
          <ol>
            <li>Get transaction hash from API response or database</li>
            <li>Visit: <code>https://sepolia.etherscan.io/tx/{'{tx_hash}'}</code></li>
            <li>View transaction details, block number, and gas used</li>
            <li>Verify hash matches your original data</li>
          </ol>
        </section>

        <section className="guide-section">
          <h2>📊 Retrieving Data</h2>
          
          <h3>Get All Sensors</h3>
          <div className="code-block">
            <code>GET {window.location.origin}/api/sensors</code>
          </div>

          <h3>Get Sensor Readings</h3>
          <div className="code-block">
            <code>GET {window.location.origin}/api/readings/{'{sensor_id}'}?limit=100&offset=0</code>
          </div>

          <h3>Get All Drones</h3>
          <div className="code-block">
            <code>GET {window.location.origin}/api/drones</code>
          </div>

          <h3>Get Drone Flights</h3>
          <div className="code-block">
            <code>GET {window.location.origin}/api/drone-flights?limit=50&offset=0</code>
          </div>

          <h3>Get Specific Flight</h3>
          <div className="code-block">
            <code>GET {window.location.origin}/api/drone-flights/{'{flight_id}'}</code>
          </div>
        </section>

        <section className="guide-section">
          <h2>🎛️ Control Commands</h2>
          
          <h3>Send Control Command</h3>
          <div className="code-block">
            <code>POST {window.location.origin}/api/control</code>
          </div>

          <h3>Request Body</h3>
          <div className="code-block">
            <pre>{`{
  "sensor_id": "sensor_wq_001",
  "relay_id": "pump_1",
  "state": "ON",
  "duration_sec": 600
}`}</pre>
          </div>

          <h3>Example</h3>
          <div className="code-block">
            <pre>{`const axios = require('axios');

const response = await axios.post(
  'https://web3iot.dhammada.com/api/control',
  {
    sensor_id: 'sensor_wq_001',
    relay_id: 'pump_1',
    state: 'ON',
    duration_sec: 600
  }
);

console.log('Command sent:', response.data);`}</pre>
          </div>
        </section>

        <section className="guide-section">
          <h2>🔐 Authentication & Security</h2>
          
          <p>
            Currently, the API is open for testing. For production use, consider:
          </p>
          <ul>
            <li>API key authentication</li>
            <li>Rate limiting</li>
            <li>HTTPS only</li>
            <li>Input validation</li>
            <li>IP whitelisting</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>📝 Best Practices</h2>
          
          <ol>
            <li><strong>Timestamp Format:</strong> Use ISO 8601 format (e.g., "2025-11-28T10:30:00Z")</li>
            <li><strong>Data Validation:</strong> Ensure numeric values are within expected ranges</li>
            <li><strong>Error Handling:</strong> Implement retry logic for network failures</li>
            <li><strong>Batch Processing:</strong> For multiple readings, send them sequentially or use batch endpoints</li>
            <li><strong>Monitoring:</strong> Check transaction hashes to verify on-chain recording</li>
          </ol>
        </section>

        <section className="guide-section">
          <h2>🛠️ Testing</h2>
          
          <p>Use our simulators to test integration:</p>
          
          <h3>Water Quality Simulator</h3>
          <div className="code-block">
            <pre>{`cd mqtt-simulator
npm install
node index.js`}</pre>
          </div>

          <h3>Drone Flight Simulator</h3>
          <div className="code-block">
            <pre>{`cd drone-simulator
npm install
API_URL=https://web3iot.dhammada.com/api/v1/drone-logs node index.js`}</pre>
          </div>
        </section>

        <section className="guide-section">
          <h2>📚 Additional Resources</h2>
          
          <ul>
            <li><Link to="/dashboard">View IoT Dashboard</Link> - See water quality data</li>
            <li><Link to="/drones">View Drone Flights</Link> - See flight logs</li>
            <li><Link to="/web3">Web3 Process</Link> - Learn about blockchain integration</li>
            <li><Link to="/control">Control Panel</Link> - Send device commands</li>
          </ul>
        </section>

        <section className="guide-section">
          <h2>❓ Support</h2>
          
          <p>
            For questions or issues:
          </p>
          <ul>
            <li>Check API response errors for validation issues</li>
            <li>Verify network connectivity</li>
            <li>Ensure data format matches schema</li>
            <li>Check blockchain status if tokenization fails</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default APIIntegrationGuide;

