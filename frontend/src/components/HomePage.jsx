import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="homepage">
      <div className="hero-section">
        <h1>🌊 IoT Web3 Water Quality Monitoring System</h1>
        <p className="subtitle">Industrial IoT + Blockchain Integration for Tamper-Proof Sensor Data</p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <h2>IoT Dashboard</h2>
          <p>Real-time water quality monitoring with interactive charts and sensor data visualization</p>
          <ul className="feature-list">
            <li>Time-series data visualization</li>
            <li>Multiple sensor parameters (pH, temperature, turbidity, TDS, dissolved oxygen)</li>
            <li>Click-through to blockchain verification</li>
            <li>Real-time data updates</li>
          </ul>
          <Link to="/dashboard" className="feature-link">
            Go to IoT Dashboard →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🛸</div>
          <h2>Drone Flight Logs</h2>
          <p>DJI Mavic 3 flight log ingestion with blockchain verification</p>
          <ul className="feature-list">
            <li>Real-time flight telemetry tracking</li>
            <li>GPS path visualization</li>
            <li>On-chain hash verification</li>
            <li>View tokens on EVM testnet</li>
          </ul>
          <Link to="/drones" className="feature-link">
            View Drone Flights →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔗</div>
          <h2>Web3 Process</h2>
          <p>Blockchain-based data integrity verification and tamper-proof sensor readings</p>
          <ul className="feature-list">
            <li>Ethereum Sepolia testnet integration</li>
            <li>Keccak256 hash verification</li>
            <li>On-chain transaction records</li>
            <li>Etherscan integration for verification</li>
          </ul>
          <Link to="/web3" className="feature-link">
            Learn About Web3 Process →
          </Link>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎛️</div>
          <h2>Control Panel</h2>
          <p>Device control and automation with blockchain-audited commands</p>
          <ul className="feature-list">
            <li>ON/OFF device control</li>
            <li>Timer-based automation</li>
            <li>MQTT-based command delivery</li>
            <li>Command history tracking</li>
          </ul>
          <Link to="/control" className="feature-link">
            Open Control Panel →
          </Link>
        </div>
      </div>

      <div className="info-section">
        <h2>How It Works</h2>
        <div className="workflow">
          <div className="workflow-step">
            <div className="step-number">1</div>
            <h3>Sensor Data Collection</h3>
            <p>Water quality sensors send data via MQTT protocol</p>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-step">
            <div className="step-number">2</div>
            <h3>Data Processing</h3>
            <p>Backend processes and stores data in PostgreSQL database</p>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-step">
            <div className="step-number">3</div>
            <h3>Blockchain Verification</h3>
            <p>Data hash is recorded on Ethereum Sepolia testnet</p>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-step">
            <div className="step-number">4</div>
            <h3>Visualization</h3>
            <p>Interactive dashboards display data with blockchain links</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;

