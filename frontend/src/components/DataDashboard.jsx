import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getSensors, getReadings } from '../api';
import './DataDashboard.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/';

function DataDashboard() {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [readings, setReadings] = useState([]);
  const [selectedReading, setSelectedReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parameter, setParameter] = useState('turbidity_ntu');

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    if (selectedSensor) {
      loadReadings();
      const interval = setInterval(loadReadings, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [selectedSensor]);

  const loadSensors = async () => {
    try {
      const response = await getSensors();
      setSensors(response.data);
      if (response.data.length > 0 && !selectedSensor) {
        setSelectedSensor(response.data[0].sensor_id);
      }
    } catch (error) {
      console.error('Failed to load sensors:', error);
    }
  };

  const loadReadings = async () => {
    if (!selectedSensor) return;
    setLoading(true);
    try {
      const response = await getReadings(selectedSensor, 100);
      setReadings(response.data.reverse()); // Reverse to show chronological order
    } catch (error) {
      console.error('Failed to load readings:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = readings.map(reading => ({
    timestamp: new Date(reading.ts).toLocaleTimeString(),
    ts: reading.ts,
    turbidity_ntu: reading.turbidity_ntu,
    ph: reading.ph,
    temperature_c: reading.temperature_c,
    tds_mg_l: reading.tds_mg_l,
    dissolved_oxygen_mg_l: reading.dissolved_oxygen_mg_l,
    battery_pct: reading.battery_pct,
    status: reading.status,
    raw_json: reading.raw_json,
    tx_hash: reading.tx_hash,
    block_number: reading.block_number,
    id: reading.id,
    etherscanUrl: reading.tx_hash ? `${ETHERSCAN_BASE}${reading.tx_hash}` : null
  }));

  const handlePointClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const reading = data.activePayload[0].payload;
      setSelectedReading(reading);
    }
  };

  const getParameterLabel = (param) => {
    const labels = {
      turbidity_ntu: 'Turbidity (NTU)',
      ph: 'pH',
      temperature_c: 'Temperature (°C)',
      tds_mg_l: 'TDS (mg/L)',
      dissolved_oxygen_mg_l: 'Dissolved Oxygen (mg/L)',
      battery_pct: 'Battery (%)'
    };
    return labels[param] || param;
  };

  return (
    <div className="data-dashboard">
      <div className="dashboard-header">
        <h2>Water Quality Data Dashboard</h2>
        <div className="controls">
          <select
            value={selectedSensor}
            onChange={(e) => setSelectedSensor(e.target.value)}
            className="sensor-select"
          >
            <option value="">Select Sensor</option>
            {sensors.map(sensor => (
              <option key={sensor.sensor_id} value={sensor.sensor_id}>
                {sensor.sensor_id} ({sensor.reading_count} readings)
              </option>
            ))}
          </select>
          <select
            value={parameter}
            onChange={(e) => setParameter(e.target.value)}
            className="parameter-select"
          >
            <option value="turbidity_ntu">Turbidity (NTU)</option>
            <option value="ph">pH</option>
            <option value="temperature_c">Temperature (°C)</option>
            <option value="tds_mg_l">TDS (mg/L)</option>
            <option value="dissolved_oxygen_mg_l">Dissolved Oxygen (mg/L)</option>
            <option value="battery_pct">Battery (%)</option>
          </select>
        </div>
      </div>

      {selectedSensor && (
        <div className="sensor-info">
          <div className="sensor-info-item">
            <span className="info-label">Selected Sensor:</span>
            <span className="info-value">{selectedSensor}</span>
          </div>
          {sensors.find(s => s.sensor_id === selectedSensor) && (
            <>
              <div className="sensor-info-item">
                <span className="info-label">Total Readings:</span>
                <span className="info-value">{sensors.find(s => s.sensor_id === selectedSensor).reading_count || 0}</span>
              </div>
              <div className="sensor-info-item">
                <span className="info-label">Last Reading:</span>
                <span className="info-value">
                  {sensors.find(s => s.sensor_id === selectedSensor).last_reading 
                    ? new Date(sensors.find(s => s.sensor_id === selectedSensor).last_reading).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </>
          )}
          <div className="sensor-info-item">
            <span className="info-label">Current Parameter:</span>
            <span className="info-value">{getParameterLabel(parameter)}</span>
          </div>
        </div>
      )}

      {loading && <div className="loading">Loading readings...</div>}

      {chartData.length > 0 && (
        <>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                onClick={handlePointClick}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis label={{ value: getParameterLabel(parameter), angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="custom-tooltip">
                          <p>{`${getParameterLabel(parameter)}: ${data[parameter]}`}</p>
                          <p>{`Time: ${data.timestamp}`}</p>
                          {data.tx_hash && (
                            <a
                              href={data.etherscanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tooltip-blockchain-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              🔗 View on Etherscan
                            </a>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={parameter}
                  stroke="#667eea"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="readings-list">
            <h3>Recent Readings</h3>
            <div className="readings-table-container">
              <table className="readings-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>pH</th>
                    <th>Temp (°C)</th>
                    <th>Turbidity</th>
                    <th>Status</th>
                    <th>Blockchain</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.slice(0, 10).map(reading => (
                    <tr 
                      key={reading.id}
                      onClick={() => setSelectedReading(reading)}
                      className="reading-row"
                    >
                      <td>{new Date(reading.ts).toLocaleString()}</td>
                      <td>{reading.ph}</td>
                      <td>{reading.temperature_c}</td>
                      <td>{reading.turbidity_ntu} NTU</td>
                      <td>
                        <span className={`status-badge ${reading.status?.toLowerCase()}`}>
                          {reading.status}
                        </span>
                      </td>
                      <td>
                        {reading.tx_hash ? (
                          <a
                            href={`${ETHERSCAN_BASE}${reading.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="blockchain-badge"
                            onClick={(e) => e.stopPropagation()}
                          >
                            🔗 Block #{reading.block_number}
                          </a>
                        ) : (
                          <span className="pending-badge">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {chartData.length === 0 && !loading && selectedSensor && (
        <div className="no-data">No readings available for this sensor</div>
      )}

      {selectedReading && (
        <div className="reading-detail-panel">
          <div className="panel-header">
            <h3>Reading Details</h3>
            <button onClick={() => setSelectedReading(null)} className="close-btn">×</button>
          </div>
          <div className="panel-content">
            <div className="detail-section">
              <h4>Sensor Data</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Sensor ID:</span>
                  <span className="value">{selectedReading.raw_json?.sensor_id || selectedSensor}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Timestamp:</span>
                  <span className="value">{new Date(selectedReading.ts).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">pH:</span>
                  <span className="value">{selectedReading.ph}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Temperature:</span>
                  <span className="value">{selectedReading.temperature_c} °C</span>
                </div>
                <div className="detail-item">
                  <span className="label">Turbidity:</span>
                  <span className="value">{selectedReading.turbidity_ntu} NTU</span>
                </div>
                <div className="detail-item">
                  <span className="label">TDS:</span>
                  <span className="value">{selectedReading.tds_mg_l} mg/L</span>
                </div>
                <div className="detail-item">
                  <span className="label">Dissolved Oxygen:</span>
                  <span className="value">{selectedReading.dissolved_oxygen_mg_l} mg/L</span>
                </div>
                <div className="detail-item">
                  <span className="label">Battery:</span>
                  <span className="value">{selectedReading.battery_pct}%</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className={`value status ${selectedReading.status?.toLowerCase()}`}>
                    {selectedReading.status}
                  </span>
                </div>
              </div>
            </div>

            {selectedReading.tx_hash && (
              <div className="detail-section">
                <h4>Blockchain Verification</h4>
                <div className="blockchain-link">
                  <a
                    href={`${ETHERSCAN_BASE}${selectedReading.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="etherscan-link"
                  >
                    🔗 View Transaction on Etherscan (Sepolia)
                  </a>
                  <div className="blockchain-info">
                    <div className="tx-hash">
                      <span className="label">Transaction Hash:</span>
                      <code>{selectedReading.tx_hash}</code>
                    </div>
                    {selectedReading.block_number && (
                      <div className="block-info">
                        <span className="label">Block Number:</span>
                        <a
                          href={`https://sepolia.etherscan.io/block/${selectedReading.block_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block-link"
                        >
                          #{selectedReading.block_number}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="detail-section">
              <h4>Raw JSON</h4>
              <pre className="json-preview">
                {JSON.stringify(selectedReading.raw_json || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataDashboard;

