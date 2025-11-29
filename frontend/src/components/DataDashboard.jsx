import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getSensors, getDatapoints } from '../api';
import './DataDashboard.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/';

const PARAMETERS = [
  { key: 'ph', label: 'pH', unit: '', color: '#667eea' },
  { key: 'temperature_c', label: 'Temperature', unit: '°C', color: '#f56565' },
  { key: 'turbidity_ntu', label: 'Turbidity', unit: 'NTU', color: '#48bb78' },
  { key: 'tds_mg_l', label: 'TDS', unit: 'mg/L', color: '#ed8936' },
  { key: 'dissolved_oxygen_mg_l', label: 'Dissolved Oxygen', unit: 'mg/L', color: '#4299e1' }
];

function DataDashboard() {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [datapoints, setDatapoints] = useState({});
  const [selectedDatapoint, setSelectedDatapoint] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    if (selectedSensor) {
      loadAllDatapoints();
      const interval = setInterval(loadAllDatapoints, 10000); // Refresh every 10 seconds
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

  const loadAllDatapoints = async () => {
    if (!selectedSensor) return;
    setLoading(true);
    try {
      const allDatapoints = {};
      for (const param of PARAMETERS) {
        try {
          const response = await getDatapoints(selectedSensor, param.key, 1000);
          allDatapoints[param.key] = response.data || [];
        } catch (error) {
          console.error(`Failed to load datapoints for ${param.key}:`, error);
          allDatapoints[param.key] = [];
        }
      }
      setDatapoints(allDatapoints);
    } catch (error) {
      console.error('Failed to load datapoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChartData = (paramKey) => {
    const points = datapoints[paramKey] || [];
    return points.map(dp => ({
      timestamp: new Date(dp.ts).toLocaleString(),
      ts: dp.ts,
      value: parseFloat(dp.parameter_value),
      token_id: dp.token_id,
      tx_hash: dp.tx_hash,
      block_number: dp.block_number,
      id: dp.id,
      parameter_name: dp.parameter_name,
      etherscanUrl: dp.tx_hash ? `${ETHERSCAN_BASE}${dp.tx_hash}` : null
    }));
  };

  const handlePointClick = (data, paramKey) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const datapoint = data.activePayload[0].payload;
      setSelectedDatapoint({ ...datapoint, parameter: paramKey });
    }
  };

  const getParameterInfo = (paramKey) => {
    return PARAMETERS.find(p => p.key === paramKey) || { key: paramKey, label: paramKey, unit: '', color: '#667eea' };
  };

  const hasData = Object.values(datapoints).some(arr => arr.length > 0);

  return (
    <div className="data-dashboard">
      <div className="dashboard-header">
        <h2>Water Quality Data Dashboard</h2>
        <p className="subtitle">Time-series visualization of individual parameter measurements (each tokenized separately)</p>
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
        </div>
      )}

      {loading && <div className="loading">Loading datapoints...</div>}

      {hasData && (
        <div className="charts-grid">
          {PARAMETERS.map(param => {
            const chartData = getChartData(param.key);
            if (chartData.length === 0) return null;
            
            return (
              <div key={param.key} className="chart-card">
                <h3>{param.label} ({param.unit})</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={chartData}
                      onClick={(data) => handlePointClick(data, param.key)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval="preserveStartEnd"
                      />
                      <YAxis label={{ value: `${param.label} (${param.unit})`, angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="custom-tooltip">
                                <p><strong>{param.label}:</strong> {data.value} {param.unit}</p>
                                <p><strong>Time:</strong> {data.timestamp}</p>
                                {data.token_id && <p><strong>Token ID:</strong> {data.token_id}</p>}
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
                        dataKey="value"
                        stroke={param.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                        name={param.label}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-stats">
                  <span>Data Points: {chartData.length}</span>
                  <span>Tokenized: {chartData.filter(d => d.token_id).length}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasData && !loading && selectedSensor && (
        <div className="no-data">No datapoints available for this sensor. Data will appear here once sensor readings are submitted.</div>
      )}

      {selectedDatapoint && (
        <div className="datapoint-detail-panel">
          <div className="panel-header">
            <h3>Datapoint Details</h3>
            <button onClick={() => setSelectedDatapoint(null)} className="close-btn">×</button>
          </div>
          <div className="panel-content">
            <div className="detail-section">
              <h4>Measurement Data</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Sensor ID:</span>
                  <span className="value">{selectedSensor}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Parameter:</span>
                  <span className="value">{getParameterInfo(selectedDatapoint.parameter).label}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Value:</span>
                  <span className="value">{selectedDatapoint.value} {getParameterInfo(selectedDatapoint.parameter).unit}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Timestamp:</span>
                  <span className="value">{selectedDatapoint.timestamp}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Blockchain Verification</h4>
              {selectedDatapoint.tx_hash ? (
                <div className="blockchain-link">
                  <a
                    href={selectedDatapoint.etherscanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="etherscan-link"
                  >
                    🔗 View Transaction on Etherscan (Sepolia)
                  </a>
                  <div className="blockchain-info">
                    <div className="tx-hash">
                      <span className="label">Token ID:</span>
                      <code>{selectedDatapoint.token_id}</code>
                    </div>
                    <div className="tx-hash">
                      <span className="label">Transaction Hash:</span>
                      <code>{selectedDatapoint.tx_hash}</code>
                    </div>
                    {selectedDatapoint.block_number && (
                      <div className="block-info">
                        <span className="label">Block Number:</span>
                        <a
                          href={`https://sepolia.etherscan.io/block/${selectedDatapoint.block_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block-link"
                        >
                          #{selectedDatapoint.block_number}
                        </a>
                      </div>
                    )}
                  </div>
                  <p className="verification-note">
                    ✅ This datapoint is tokenized on-chain. The hash is: <code>hash(sensor_id + timestamp + parameter_name + parameter_value)</code>
                  </p>
                </div>
              ) : (
                <div className="blockchain-pending">
                  <p>⏳ <strong>Status: Pending Tokenization</strong></p>
                  <p className="pending-explanation">
                    This datapoint is stored in the database but not yet tokenized on blockchain. Tokenization will happen automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataDashboard;
