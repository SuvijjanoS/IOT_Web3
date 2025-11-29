import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { getDroneFlights, getAllDrones, getFlightById, getFlightsByDroneId } from '../api';
import './DroneFlightDashboard.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io/tx/';

function DroneFlightDashboard() {
  const [drones, setDrones] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState('');
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flightDetails, setFlightDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parameter, setParameter] = useState('height_agl_m');

  useEffect(() => {
    loadDrones();
  }, []);

  useEffect(() => {
    if (selectedDrone) {
      loadFlights();
    } else {
      loadAllFlights();
    }
  }, [selectedDrone]);

  useEffect(() => {
    if (selectedFlight) {
      loadFlightDetails();
    }
  }, [selectedFlight]);

  // Helper function to format flight ID
  const formatFlightId = (flightId) => {
    if (!flightId) return 'Unknown';
    // Remove MAVIC3E_FLIGHT_ prefix and replace underscores with spaces
    let formatted = flightId.replace(/^MAVIC3E_FLIGHT_/i, '');
    formatted = formatted.replace(/_/g, ' ');
    // Extract location name (first part before numbers)
    const parts = formatted.split(/\d/);
    if (parts.length > 0) {
      return parts[0].trim();
    }
    return formatted.substring(0, 30);
  };

  const loadDrones = async () => {
    try {
      const response = await getAllDrones();
      setDrones(response.data);
      if (response.data.length > 0 && !selectedDrone) {
        setSelectedDrone(response.data[0].drone_id);
      }
    } catch (error) {
      console.error('Failed to load drones:', error);
    }
  };

  const loadAllFlights = async () => {
    setLoading(true);
    try {
      const response = await getDroneFlights(50, 0);
      setFlights(response.data);
    } catch (error) {
      console.error('Failed to load flights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFlights = async () => {
    if (!selectedDrone) return;
    setLoading(true);
    try {
      const response = await getFlightsByDroneId(selectedDrone, 50);
      setFlights(response.data);
    } catch (error) {
      console.error('Failed to load flights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFlightDetails = async () => {
    if (!selectedFlight) return;
    setLoading(true);
    try {
      const response = await getFlightById(selectedFlight);
      setFlightDetails(response.data);
    } catch (error) {
      console.error('Failed to load flight details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getParameterLabel = (param) => {
    const labels = {
      height_agl_m: 'Height AGL (m)',
      alt_asl_m: 'Altitude ASL (m)',
      h_speed_ms: 'Horizontal Speed (m/s)',
      battery_pct: 'Battery (%)',
      gps_level: 'GPS Level',
      gps_sats: 'GPS Satellites',
      pitch_deg: 'Pitch (deg)',
      roll_deg: 'Roll (deg)',
      yaw_deg: 'Yaw (deg)'
    };
    return labels[param] || param;
  };

  const chartData = flightDetails?.samples?.map(sample => ({
    t_s: sample.t_ms / 1000,
    height_agl_m: parseFloat(sample.height_agl_m) || 0,
    alt_asl_m: parseFloat(sample.alt_asl_m) || 0,
    h_speed_ms: parseFloat(sample.h_speed_ms) || 0,
    battery_pct: sample.battery_pct || 0,
    gps_level: sample.gps_level || 0,
    gps_sats: sample.gps_sats || 0,
    pitch_deg: parseFloat(sample.pitch_deg) || 0,
    roll_deg: parseFloat(sample.roll_deg) || 0,
    yaw_deg: parseFloat(sample.yaw_deg) || 0,
    lat: parseFloat(sample.lat) || 0,
    lon: parseFloat(sample.lon) || 0
  })) || [];

  return (
    <div className="drone-flight-dashboard">
      <div className="dashboard-header">
        <h2>🛸 Drone Flight Logs Dashboard</h2>
        <div className="controls">
          <select
            value={selectedDrone}
            onChange={(e) => {
              setSelectedDrone(e.target.value);
              setSelectedFlight(null);
              setFlightDetails(null);
            }}
            className="drone-select"
          >
            <option value="">All Drones</option>
            {drones.map(drone => (
              <option key={drone.drone_id} value={drone.drone_id}>
                {drone.drone_id} ({drone.flight_count} flights)
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedDrone && (
        <div className="drone-info">
          <div className="drone-info-item">
            <span className="info-label">Selected Drone:</span>
            <span className="info-value">{selectedDrone}</span>
          </div>
          <div className="drone-info-item">
            <span className="info-label">Total Flights:</span>
            <span className="info-value">{flights.length}</span>
          </div>
        </div>
      )}

      {loading && <div className="loading">Loading flights...</div>}

      <div className="flights-list">
        <h3>Flight Logs</h3>
        {flights.length === 0 ? (
          <div className="no-data">No flights found</div>
        ) : (
          <div className="flights-grid">
            {flights.map(flight => (
              <div
                key={flight.flight_id}
                className={`flight-card ${selectedFlight === flight.flight_id ? 'selected' : ''}`}
                onClick={() => setSelectedFlight(flight.flight_id)}
              >
                <div className="flight-card-header">
                  <h4 title={flight.flight_id}>
                    {formatFlightId(flight.flight_id)}
                  </h4>
                  <span 
                    className={`status-badge ${flight.tokenization_status?.toLowerCase()}`}
                    title={flight.tokenization_status === 'PENDING' ? 'Flight log recorded but not yet tokenized on blockchain. Will be recorded once blockchain contracts are deployed.' : 'Flight log tokenized on blockchain'}
                  >
                    {flight.tokenization_status || 'PENDING'}
                  </span>
                </div>
                <div className="flight-card-body">
                  <div className="flight-stat">
                    <span className="stat-label">Duration:</span>
                    <span className="stat-value">{parseFloat(flight.duration_s || 0).toFixed(1)}s</span>
                  </div>
                  <div className="flight-stat">
                    <span className="stat-label">Max Height:</span>
                    <span className="stat-value">{parseFloat(flight.max_height_agl_m || 0).toFixed(1)}m</span>
                  </div>
                  <div className="flight-stat">
                    <span className="stat-label">Max Speed:</span>
                    <span className="stat-value">{parseFloat(flight.max_h_speed_ms || 0).toFixed(1)} m/s</span>
                  </div>
                  <div className="flight-stat">
                    <span className="stat-label">Samples:</span>
                    <span className="stat-value">{flight.samples_count}</span>
                  </div>
                  <div className="flight-stat">
                    <span className="stat-label">Started:</span>
                    <span className="stat-value">
                      {new Date(flight.started_at_utc).toLocaleString()}
                    </span>
                  </div>
                  {flight.tx_hash && (
                    <div className="flight-stat">
                      <a
                        href={`${ETHERSCAN_BASE}${flight.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="blockchain-badge"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗 Block #{flight.block_number || 'N/A'}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {flightDetails && (
        <div className="flight-details">
          <div className="details-header">
            <h3>Flight Details: {flightDetails.flight_id}</h3>
            <button className="close-btn" onClick={() => {
              setSelectedFlight(null);
              setFlightDetails(null);
            }}>×</button>
          </div>

          <div className="details-content">
            <div className="details-section">
              <h4>Flight Information</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="label">Drone ID:</span>
                  <span className="value">{flightDetails.drone_id}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Model:</span>
                  <span className="value">{flightDetails.drone_model}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Started:</span>
                  <span className="value">{new Date(flightDetails.started_at_utc).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Duration:</span>
                  <span className="value">{parseFloat(flightDetails.duration_s || 0).toFixed(1)}s</span>
                </div>
                <div className="detail-item">
                  <span className="label">Samples:</span>
                  <span className="value">{flightDetails.samples_count}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Max Height:</span>
                  <span className="value">{parseFloat(flightDetails.max_height_agl_m || 0).toFixed(1)}m</span>
                </div>
                {flightDetails.tx_hash && (
                  <>
                    <div className="detail-item">
                      <span className="label">Transaction:</span>
                      <a
                        href={`${ETHERSCAN_BASE}${flightDetails.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="value blockchain-link"
                      >
                        🔗 View Transaction on Etherscan
                      </a>
                    </div>
                    {flightDetails.block_number && (
                      <div className="detail-item">
                        <span className="label">Block Number:</span>
                        <a
                          href={`https://sepolia.etherscan.io/block/${flightDetails.block_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="value blockchain-link"
                        >
                          🔗 Block #{flightDetails.block_number}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {chartData.length > 0 && (
              <>
                <div className="details-section">
                  <h4>Time Series Data</h4>
                  <div className="chart-controls">
                    <select
                      value={parameter}
                      onChange={(e) => setParameter(e.target.value)}
                      className="parameter-select"
                    >
                      <option value="height_agl_m">Height AGL (m)</option>
                      <option value="alt_asl_m">Altitude ASL (m)</option>
                      <option value="h_speed_ms">Horizontal Speed (m/s)</option>
                      <option value="battery_pct">Battery (%)</option>
                      <option value="gps_level">GPS Level</option>
                      <option value="gps_sats">GPS Satellites</option>
                      <option value="pitch_deg">Pitch (deg)</option>
                      <option value="roll_deg">Roll (deg)</option>
                      <option value="yaw_deg">Yaw (deg)</option>
                    </select>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="t_s" label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }} />
                        <YAxis label={{ value: getParameterLabel(parameter), angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={parameter} stroke="#667eea" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="details-section">
                  <h4>Flight Path (GPS)</h4>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={400}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          dataKey="lon" 
                          name="Longitude"
                          label={{ value: 'Longitude', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="lat" 
                          name="Latitude"
                          label={{ value: 'Latitude', angle: -90, position: 'insideLeft' }}
                        />
                        <ZAxis type="number" dataKey="height_agl_m" name="Height" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        <Scatter name="Flight Path" data={chartData} fill="#667eea" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DroneFlightDashboard;

