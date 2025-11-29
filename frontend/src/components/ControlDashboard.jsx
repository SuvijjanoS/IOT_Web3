import React, { useState, useEffect } from 'react';
import { getSensors, sendControlCommand, getControlHistory } from '../api';
import './ControlDashboard.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/';

function ControlDashboard() {
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState('');
  const [relayId, setRelayId] = useState('pump_1');
  const [state, setState] = useState('OFF');
  const [durationSec, setDurationSec] = useState(600);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);

  useEffect(() => {
    loadSensors();
  }, []);

  useEffect(() => {
    if (selectedSensor) {
      loadCommandHistory();
      const interval = setInterval(loadCommandHistory, 5000); // Refresh every 5 seconds
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

  const loadCommandHistory = async () => {
    if (!selectedSensor) return;
    try {
      const response = await getControlHistory(selectedSensor, 20);
      setCommandHistory(response.data);
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  };

  const handleSendCommand = async () => {
    if (!selectedSensor || !relayId) {
      setMessage('Please select a sensor and enter a relay ID');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await sendControlCommand(selectedSensor, relayId, state, durationSec);
      setMessage(`✅ Command sent successfully! ${state === 'ON' ? `Will turn off after ${durationSec} seconds.` : ''}`);
      setTimeout(() => {
        loadCommandHistory();
      }, 1000);
    } catch (error) {
      setMessage(`❌ Failed to send command: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="control-dashboard">
      <div className="dashboard-header">
        <h2>Device Control Panel</h2>
      </div>

      <div className="control-panel">
        <div className="control-form">
          <div className="form-group">
            <label htmlFor="sensor-select">Sensor/Device:</label>
            <select
              id="sensor-select"
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value)}
              className="form-control"
            >
              <option value="">Select Sensor</option>
              {sensors.map(sensor => (
                <option key={sensor.sensor_id} value={sensor.sensor_id}>
                  {sensor.sensor_id}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="relay-id">Relay/Actuator ID:</label>
            <input
              id="relay-id"
              type="text"
              value={relayId}
              onChange={(e) => setRelayId(e.target.value)}
              placeholder="e.g., pump_1, valve_1"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="state-select">State:</label>
            <select
              id="state-select"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="form-control"
            >
              <option value="OFF">OFF</option>
              <option value="ON">ON</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration (seconds):</label>
            <input
              id="duration"
              type="number"
              value={durationSec}
              onChange={(e) => setDurationSec(parseInt(e.target.value) || 0)}
              min="0"
              placeholder="0 = no auto-off"
              className="form-control"
            />
            <small className="form-hint">
              {durationSec > 0 ? `Device will turn ${state === 'ON' ? 'OFF' : 'ON'} after ${formatDuration(durationSec)}` : 'No automatic toggle'}
            </small>
          </div>

          <button
            onClick={handleSendCommand}
            disabled={loading || !selectedSensor || !relayId}
            className={`send-button ${state === 'ON' ? 'on' : 'off'}`}
          >
            {loading ? 'Sending...' : `Turn ${state}`}
          </button>

          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="control-info">
          <h3>How it works</h3>
          <ul>
            <li>Select a sensor/device and relay ID</li>
            <li>Choose ON or OFF state</li>
            <li>Set duration (0 = no auto-toggle)</li>
            <li>Command is sent via MQTT to the device</li>
            <li>Command hash is recorded on-chain for auditability</li>
          </ul>
        </div>
      </div>

      {selectedSensor && (
        <div className="command-history">
          <h3>Command History - {selectedSensor}</h3>
          {commandHistory.length === 0 ? (
            <div className="no-history">No commands sent yet</div>
          ) : (
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Relay ID</th>
                    <th>State</th>
                    <th>Duration</th>
                    <th>Blockchain</th>
                  </tr>
                </thead>
                <tbody>
                  {commandHistory.map(cmd => (
                    <tr key={cmd.id}>
                      <td>{new Date(cmd.created_at).toLocaleString()}</td>
                      <td><code>{cmd.relay_id}</code></td>
                      <td>
                        <span className={`state-badge ${cmd.state.toLowerCase()}`}>
                          {cmd.state}
                        </span>
                      </td>
                      <td>{cmd.duration_sec ? formatDuration(cmd.duration_sec) : '-'}</td>
                      <td>
                        {cmd.tx_hash ? (
                          <div className="blockchain-status-confirmed">
                            <span className="status-icon">✅</span>
                            <a
                              href={`${ETHERSCAN_BASE}${cmd.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="tx-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Transaction
                            </a>
                            {cmd.block_number && (
                              <a
                                href={`https://sepolia.etherscan.io/block/${cmd.block_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Block #{cmd.block_number}
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="blockchain-status-pending">
                            <span className="status-icon">⏳</span>
                            <span className="pending-text">Processing...</span>
                            <button
                              className="refresh-btn"
                              onClick={() => loadCommandHistory()}
                              title="Refresh status"
                            >
                              🔄 Refresh
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ControlDashboard;

