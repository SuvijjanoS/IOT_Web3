import React from 'react';
import { Link } from 'react-router-dom';
import './Web3Process.css';

function Web3Process() {
  return (
    <div className="web3-process">
      <div className="web3-header">
        <h1>🔗 Web3 Blockchain Process</h1>
        <p className="subtitle">How blockchain ensures data integrity and tamper-proof verification</p>
      </div>

      <div className="process-content">
        <section className="process-section">
          <h2>Overview</h2>
          <p>
            Our IoT Web3 system uses Ethereum blockchain to create an immutable record of all sensor readings
            and control commands. This ensures data integrity and provides tamper-proof verification.
          </p>
        </section>

        <section className="process-section">
          <h2>How It Works</h2>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-icon">📡</div>
              <h3>1. Sensor Data Collection</h3>
              <p>
                Water quality sensors send JSON data via MQTT protocol containing parameters like pH,
                temperature, turbidity, TDS, and dissolved oxygen.
              </p>
            </div>

            <div className="process-step">
              <div className="step-icon">🔐</div>
              <h3>2. Hash Generation</h3>
              <p>
                The backend computes a Keccak256 hash of the sensor data. This creates a unique fingerprint
                that cannot be reverse-engineered but can verify data integrity.
              </p>
              <code className="code-block">
                hash = keccak256(JSON.stringify(sensorData))
              </code>
            </div>

            <div className="process-step">
              <div className="step-icon">⛓️</div>
              <h3>3. Blockchain Recording</h3>
              <p>
                The hash is recorded on Ethereum Sepolia testnet via a smart contract. Each reading gets:
              </p>
              <ul>
                <li>Sensor ID</li>
                <li>Timestamp</li>
                <li>Data hash (Keccak256)</li>
                <li>Transaction hash</li>
                <li>Block number</li>
              </ul>
            </div>

            <div className="process-step">
              <div className="step-icon">✅</div>
              <h3>4. Verification</h3>
              <p>
                Users can verify any reading by clicking on a data point in the dashboard, which shows:
              </p>
              <ul>
                <li>Link to Etherscan transaction</li>
                <li>Block number and timestamp</li>
                <li>Ability to verify hash matches original data</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="process-section">
          <h2>Smart Contract</h2>
          <p>
            Our <code>WaterQualityRegistry</code> smart contract stores:
          </p>
          <div className="contract-info">
            <div className="contract-feature">
              <h4>Reading Records</h4>
              <code>
                recordReading(sensorId, timestamp, dataHash)
              </code>
            </div>
            <div className="contract-feature">
              <h4>Command Records</h4>
              <code>
                recordCommand(sensorId, relayId, command, timestamp, commandHash)
              </code>
            </div>
          </div>
        </section>

        <section className="process-section">
          <h2>Benefits</h2>
          <div className="benefits-grid">
            <div className="benefit">
              <h3>🔒 Tamper-Proof</h3>
              <p>Once recorded on blockchain, data cannot be altered without detection</p>
            </div>
            <div className="benefit">
              <h3>📜 Audit Trail</h3>
              <p>Complete history of all sensor readings and control commands</p>
            </div>
            <div className="benefit">
              <h3>🌐 Decentralized</h3>
              <p>No single point of failure - data verified by Ethereum network</p>
            </div>
            <div className="benefit">
              <h3>🔍 Transparent</h3>
              <p>Anyone can verify data integrity using Etherscan</p>
            </div>
          </div>
        </section>

        <section className="process-section">
          <h2>Try It Out</h2>
          <div className="cta-buttons">
            <Link to="/dashboard" className="cta-button primary">
              View IoT Dashboard
            </Link>
            <Link to="/control" className="cta-button secondary">
              Open Control Panel
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Web3Process;

