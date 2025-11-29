import React, { useState } from 'react';
import { registerDevice, getAllDevices, getAllDrones, getSensors } from '../api';
import './AdminConfiguration.css';

function AdminConfiguration() {
  const apiBaseUrl = window.location.origin;
  const [refreshing, setRefreshing] = useState(false);
  const [deviceCount, setDeviceCount] = useState(null);
  const [droneCount, setDroneCount] = useState(null);
  const [sensorCount, setSensorCount] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);
  const [deviceType, setDeviceType] = useState('water'); // 'water' or 'drone'

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [devicesRes, dronesRes, sensorsRes] = await Promise.all([
        getAllDevices().catch(() => ({ data: [] })),
        getAllDrones().catch(() => ({ data: [] })),
        getSensors().catch(() => ({ data: [] }))
      ]);
      setDeviceCount(devicesRes.data?.length || 0);
      setDroneCount(dronesRes.data?.length || 0);
      setSensorCount(sensorsRes.data?.length || 0);
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSimulateRegistration = async () => {
    setRegistering(true);
    setRegisterResult(null);
    
    try {
      let deviceData;
      
      if (deviceType === 'water') {
        // Generate random water quality sensor
        const sensorId = `WQ${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        deviceData = {
          manufacturer: 'IoT Solutions Inc',
          model: 'WQ-2024',
          serial_number: sensorId,
          hardware_nonce: `HW${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`
        };
      } else {
        // Generate random drone
        const droneId = `DJI-M3-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        deviceData = {
          manufacturer: 'DJI',
          model: 'Mavic 3 Enterprise',
          serial_number: droneId,
          hardware_nonce: 'HW003'
        };
      }
      
      const response = await registerDevice(deviceData);
      setRegisterResult({
        success: true,
        device: response.data,
        message: `${deviceType === 'water' ? 'Water Quality Sensor' : 'Drone'} registered successfully!`
      });
      
      // Refresh counts
      await handleRefresh();
    } catch (error) {
      setRegisterResult({
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to register device'
      });
    } finally {
      setRegistering(false);
    }
  };

  // Load counts on mount
  React.useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <div className="admin-configuration">
      <div className="admin-header">
        <h1>⚙️ Admin Configuration</h1>
        <p className="subtitle">Manage IoT devices, view schemas, and register new devices</p>
        <button 
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Device List'}
        </button>
        {(deviceCount !== null || droneCount !== null || sensorCount !== null) && (
          <div className="device-counts">
            <span>Registered Devices: {deviceCount || 0}</span>
            <span>Drones: {droneCount || 0}</span>
            <span>Sensors: {sensorCount || 0}</span>
          </div>
        )}
      </div>

      <div className="admin-content">
        {/* Device Registration Section */}
        <section className="config-section">
          <h2>📱 Device Registration</h2>
          
          <div className="registration-controls">
            <div className="device-type-selector">
              <label>Device Type:</label>
              <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
                <option value="water">Water Quality Sensor</option>
                <option value="drone">Drone</option>
              </select>
            </div>
            <button 
              className="simulate-register-btn"
              onClick={handleSimulateRegistration}
              disabled={registering}
            >
              {registering ? '⏳ Registering...' : '🚀 Simulate Device Registration'}
            </button>
          </div>

          {registerResult && (
            <div className={`register-result ${registerResult.success ? 'success' : 'error'}`}>
              {registerResult.success ? (
                <div>
                  <h4>✅ {registerResult.message}</h4>
                  <div className="device-info">
                    <p><strong>Device ID:</strong> <code>{registerResult.device.deviceId}</code></p>
                    <p><strong>Device Wallet:</strong> <code>{registerResult.device.deviceWallet}</code></p>
                    <p><strong>Manufacturer:</strong> {registerResult.device.manufacturer}</p>
                    <p><strong>Model:</strong> {registerResult.device.model}</p>
                    <p><strong>Serial Number:</strong> {registerResult.device.serialNumber}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4>❌ Registration Failed</h4>
                  <p>{registerResult.error}</p>
                </div>
              )}
            </div>
          )}

          <h3>Device Registration Schema</h3>
          <div className="code-block">
            <pre>{`POST ${apiBaseUrl}/api/devices
Content-Type: application/json

{
  "manufacturer": "IoT Solutions Inc",  // Required: Device manufacturer
  "model": "WQ-2024",                    // Required: Device model
  "serial_number": "WQ001234",          // Required: Unique serial number
  "hardware_nonce": "HW001",            // Required: Hardware nonce/identifier
  "device_wallet": "0x..."              // Optional: Ethereum wallet address (auto-generated if not provided)
}`}</pre>
          </div>

          <h3>Example: Water Quality Sensor</h3>
          <div className="code-block">
            <pre>{`{
  "manufacturer": "IoT Solutions Inc",
  "model": "WQ-2024",
  "serial_number": "WQ001234",
  "hardware_nonce": "HW001"
}`}</pre>
          </div>

          <h3>Example: Drone</h3>
          <div className="code-block">
            <pre>{`{
  "manufacturer": "DJI",
  "model": "Mavic 3 Enterprise",
  "serial_number": "DJI-M3-999",
  "hardware_nonce": "HW003"
}`}</pre>
          </div>
        </section>

        {/* IoT Device Data Schema */}
        <section className="config-section">
          <h2>🌊 IoT Device Data Schema</h2>
          
          <h3>Water Quality Sensor Reading</h3>
          <div className="code-block">
            <pre>{`POST ${apiBaseUrl}/api/v1/sensor-readings
Content-Type: application/json

{
  "sensor_id": "sensor_wq_001",        // Required: Sensor identifier
  "ts": "2025-11-28T10:30:00Z",       // Required: ISO 8601 timestamp
  "parameters": {                      // Required: Sensor readings
    "ph": 7.2,                         // pH level (0-14)
    "temperature_c": 25.5,             // Temperature in Celsius
    "turbidity_ntu": 2.1,              // Turbidity in NTU
    "tds_mg_l": 150,                   // Total Dissolved Solids (mg/L)
    "dissolved_oxygen_mg_l": 8.5       // Dissolved oxygen (mg/L)
  },
  "battery_pct": 95,                   // Optional: Battery percentage (0-100)
  "status": "OK",                      // Optional: Device status
  "location": {                        // Optional: GPS location
    "lat": 13.756331,
    "lng": 100.501765
  }
}`}</pre>
          </div>

          <h3>Field Descriptions</h3>
          <ul>
            <li><strong>sensor_id</strong>: Unique identifier for the sensor (should match registered device serial_number)</li>
            <li><strong>ts</strong>: Timestamp in ISO 8601 format (UTC)</li>
            <li><strong>parameters.ph</strong>: pH level, typically 6.5-8.5 for drinking water</li>
            <li><strong>parameters.temperature_c</strong>: Water temperature in degrees Celsius</li>
            <li><strong>parameters.turbidity_ntu</strong>: Turbidity measurement in NTU (Nephelometric Turbidity Units)</li>
            <li><strong>parameters.tds_mg_l</strong>: Total Dissolved Solids in milligrams per liter</li>
            <li><strong>parameters.dissolved_oxygen_mg_l</strong>: Dissolved oxygen concentration</li>
            <li><strong>battery_pct</strong>: Battery level (0-100)</li>
            <li><strong>status</strong>: Device status (e.g., "OK", "LOW_BATTERY", "ERROR")</li>
            <li><strong>location</strong>: GPS coordinates (latitude, longitude)</li>
          </ul>
        </section>

        {/* Drone Log Data Schema */}
        <section className="config-section">
          <h2>🛸 Drone Flight Log Schema</h2>
          
          <h3>Flight Log Submission</h3>
          <div className="code-block">
            <pre>{`POST ${apiBaseUrl}/api/v1/drone-logs
Content-Type: application/json

{
  "flight_id": "FLIGHT_123",            // Required: Unique flight identifier
  "drone_id": "MAVIC3_001",            // Required: Drone identifier (should match registered device serial_number)
  "drone_model": "DJI Mavic 3",        // Required: Drone model name
  "started_at_utc": "2025-11-28T06:20:00Z",  // Required: Flight start time (ISO 8601)
  "firmware_version": "01.01.1200",    // Optional: Firmware version
  "app_name": "DJI Fly",               // Optional: Control app name
  "app_version": "1.15.0",             // Optional: App version
  "home_point": {                       // Optional: Home point coordinates
    "lat": 13.756331,
    "lon": 100.501765,
    "alt_asl_m": 2.5
  },
  "samples_hz": 10,                     // Optional: Sampling rate (Hz)
  "samples": [                          // Required: Array of telemetry samples
    {
      "t_ms": 0,                        // Time offset in milliseconds
      "lat": 13.756331,                 // Latitude
      "lon": 100.501765,                // Longitude
      "height_agl_m": 0.2,              // Height above ground level (meters)
      "alt_asl_m": 2.7,                 // Altitude above sea level (meters)
      "pitch_deg": 0.0,                 // Pitch angle (degrees)
      "roll_deg": 0.0,                  // Roll angle (degrees)
      "yaw_deg": 0.0,                   // Yaw angle (degrees)
      "vx_ms": 0.0,                     // Velocity X (m/s)
      "vy_ms": 0.0,                     // Velocity Y (m/s)
      "vz_ms": 0.0,                     // Velocity Z (m/s)
      "h_speed_ms": 0.0,                // Horizontal speed (m/s)
      "gps_level": 4,                   // GPS signal level (0-5)
      "gps_sats": 18,                   // Number of GPS satellites
      "flight_mode": "P-GPS",           // Flight mode
      "rc_aileron_pct": 0.0,            // RC aileron percentage
      "rc_elevator_pct": 0.0,           // RC elevator percentage
      "rc_throttle_pct": 10.0,          // RC throttle percentage
      "rc_rudder_pct": 0.0,             // RC rudder percentage
      "battery_pct": 99,                // Battery percentage
      "battery_voltage_v": 15.9,        // Battery voltage (volts)
      "warnings": [],                   // Array of warning messages
      "event_flags": {                  // Event flags
        "photo_taken": false,
        "video_rec": true,
        "rth_active": false
      }
    }
    // ... more samples (typically 1-10 Hz)
  ]
}`}</pre>
          </div>

          <h3>Field Descriptions</h3>
          <ul>
            <li><strong>flight_id</strong>: Unique identifier for this flight log</li>
            <li><strong>drone_id</strong>: Drone identifier (should match registered device serial_number)</li>
            <li><strong>drone_model</strong>: Model name (e.g., "DJI Mavic 3", "DJI Mavic 3 Enterprise")</li>
            <li><strong>started_at_utc</strong>: Flight start timestamp in ISO 8601 format (UTC)</li>
            <li><strong>samples</strong>: Array of telemetry data points, typically 1-10 samples per second</li>
            <li><strong>samples[].t_ms</strong>: Time offset from flight start in milliseconds</li>
            <li><strong>samples[].lat/lon</strong>: GPS coordinates (decimal degrees)</li>
            <li><strong>samples[].height_agl_m</strong>: Height above ground level in meters</li>
            <li><strong>samples[].alt_asl_m</strong>: Altitude above sea level in meters</li>
            <li><strong>samples[].pitch/roll/yaw_deg</strong>: Aircraft orientation angles in degrees</li>
            <li><strong>samples[].vx_ms/vy_ms/vz_ms</strong>: Velocity components in m/s</li>
            <li><strong>samples[].h_speed_ms</strong>: Horizontal speed in m/s</li>
            <li><strong>samples[].gps_level</strong>: GPS signal quality (0-5, higher is better)</li>
            <li><strong>samples[].gps_sats</strong>: Number of GPS satellites in view</li>
            <li><strong>samples[].flight_mode</strong>: Flight mode (e.g., "P-GPS", "ATTI", "RTH")</li>
            <li><strong>samples[].battery_pct</strong>: Battery percentage (0-100)</li>
            <li><strong>samples[].battery_voltage_v</strong>: Battery voltage in volts</li>
          </ul>
        </section>

        {/* Instructions Section */}
        <section className="config-section">
          <h2>📋 Instructions</h2>
          
          <h3>Step 1: Register Your Device</h3>
          <ol>
            <li>Use the device registration schema above to register your IoT device or drone</li>
            <li>Each device gets a unique <code>deviceId</code> (computed from manufacturer + model + serial_number + hardware_nonce)</li>
            <li>Each device gets a unique Ethereum wallet address (auto-generated if not provided)</li>
            <li>Registered devices can receive tokens when their logs are tokenized</li>
          </ol>

          <h3>Step 2: Submit Device Data</h3>
          <ol>
            <li><strong>For Water Quality Sensors:</strong> Submit readings using the IoT device data schema</li>
            <li><strong>For Drones:</strong> Submit flight logs using the drone flight log schema</li>
            <li>Ensure <code>sensor_id</code> or <code>drone_id</code> matches the registered device's <code>serial_number</code></li>
            <li>Data will be automatically tokenized on-chain if the device is registered</li>
          </ol>

          <h3>Step 3: Verify Tokenization</h3>
          <ol>
            <li>Check the transaction hash returned from the API</li>
            <li>View on Etherscan: <code>https://sepolia.etherscan.io/tx/{'{tx_hash}'}</code></li>
            <li>Verify tokens are minted to the correct device wallet</li>
            <li>Use the Blockchain Info page to view all registered devices and their wallets</li>
          </ol>

          <h3>Best Practices</h3>
          <ul>
            <li>Register devices before submitting data for proper wallet assignment</li>
            <li>Use consistent <code>serial_number</code> values across registration and data submission</li>
            <li>Include all required fields in data submissions</li>
            <li>Use ISO 8601 format for timestamps (UTC)</li>
            <li>Ensure GPS coordinates are in decimal degrees format</li>
            <li>Submit samples at consistent intervals (e.g., 1-10 Hz for drones)</li>
          </ul>
        </section>

        {/* API Endpoints Reference */}
        <section className="config-section">
          <h2>🔗 API Endpoints Reference</h2>
          
          <h3>Device Management</h3>
          <ul>
            <li><code>POST {apiBaseUrl}/api/devices</code> - Register a new device</li>
            <li><code>GET {apiBaseUrl}/api/devices</code> - Get all registered devices</li>
            <li><code>GET {apiBaseUrl}/api/devices/:deviceId</code> - Get device by ID</li>
            <li><code>PATCH {apiBaseUrl}/api/devices/:deviceId/status</code> - Update device status</li>
          </ul>

          <h3>Data Submission</h3>
          <ul>
            <li><code>POST {apiBaseUrl}/api/v1/sensor-readings</code> - Submit water quality reading</li>
            <li><code>POST {apiBaseUrl}/api/v1/drone-logs</code> - Submit drone flight log</li>
          </ul>

          <h3>Data Retrieval</h3>
          <ul>
            <li><code>GET {apiBaseUrl}/api/sensors</code> - Get all sensors</li>
            <li><code>GET {apiBaseUrl}/api/readings/:sensorId</code> - Get sensor readings</li>
            <li><code>GET {apiBaseUrl}/api/drones</code> - Get all drones</li>
            <li><code>GET {apiBaseUrl}/api/drone-flights</code> - Get all flight logs</li>
            <li><code>GET {apiBaseUrl}/api/drone-flights/:flightId</code> - Get specific flight</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default AdminConfiguration;

