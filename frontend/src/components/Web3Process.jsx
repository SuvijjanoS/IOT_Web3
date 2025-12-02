import React, { useState, useEffect } from 'react';
import { getAllDevices, getAllDrones } from '../api';
import './Web3Process.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

function Web3Process() {
  const [devices, setDevices] = useState([]);
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [walletTokens, setWalletTokens] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [devicesResponse, dronesResponse] = await Promise.all([
        getAllDevices(),
        getAllDrones()
      ]);
      setDevices(devicesResponse.data || []);
      setDrones(dronesResponse.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletClick = async (walletAddress, deviceId) => {
    setSelectedWallet({ address: walletAddress, deviceId });
    // In a real implementation, you would query the blockchain for tokens
    // For now, we'll show a placeholder
    setWalletTokens([]);
    
    // Open Etherscan in new tab
    window.open(`${ETHERSCAN_BASE}/address/${walletAddress}`, '_blank');
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  return (
    <div className="web3-process">
      <div className="web3-header">
        <h1>🔗 Web3 Blockchain Process</h1>
        <p className="subtitle">View all wallets, devices, and tokenized logs on-chain</p>
      </div>

      <div className="process-content">
        {/* Wallets & Devices Section */}
        <section className="process-section">
          <h2>📱 Registered Devices & Wallets</h2>
          {loading ? (
            <div className="loading">Loading devices...</div>
          ) : (
            <div className="wallets-grid">
              {devices.map(device => (
                <div key={device.id} className="wallet-card">
                  <div className="wallet-header">
                    <h3>{device.manufacturer} {device.model}</h3>
                    <span className="device-badge">Device</span>
                  </div>
                  <div className="wallet-info">
                    <div className="info-row">
                      <span className="label">Device ID:</span>
                      <code>{formatAddress(device.deviceId)}</code>
                    </div>
                    <div className="info-row">
                      <span className="label">Wallet Address:</span>
                      <code className="wallet-address">{formatAddress(device.deviceWallet)}</code>
                    </div>
                    <div className="info-row">
                      <span className="label">Serial Number:</span>
                      <span>{device.serialNumber || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Status:</span>
                      <span className={`status-badge ${device.isActive ? 'active' : 'inactive'}`}>
                        {device.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Tokens:</span>
                      <span className="token-count">View on Etherscan</span>
                    </div>
                  </div>
                  <button
                    className="view-wallet-btn"
                    onClick={() => handleWalletClick(device.deviceWallet, device.deviceId)}
                  >
                    🔗 View Wallet on Etherscan
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Drones Section */}
        <section className="process-section">
          <h2>🛸 Registered Drones</h2>
          {loading ? (
            <div className="loading">Loading drones...</div>
          ) : drones.length === 0 ? (
            <div className="no-data">No drones registered yet</div>
          ) : (
            <div className="drones-list">
              {drones.map(drone => (
                <div key={drone.drone_id} className="drone-card">
                  <div className="drone-info">
                    <h3>{drone.drone_id}</h3>
                    <p><strong>Total Flights:</strong> {drone.flight_count}</p>
                    <p><strong>Last Flight:</strong> {new Date(drone.last_flight).toLocaleString()}</p>
                  </div>
                  <a
                    href={`/drones?drone=${encodeURIComponent(drone.drone_id)}`}
                    className="view-flights-btn"
                  >
                    View Flights
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Smart Contracts Section */}
        <section className="process-section">
          <h2>📜 Smart Contracts</h2>
          <div className="contracts-grid">
            <div className="contract-card">
              <h3>DeviceRegistry</h3>
              <code>0x38933cf220E8c352D1bcC7DC684093415245E02b</code>
              <a
                href={`${ETHERSCAN_BASE}/address/0x38933cf220E8c352D1bcC7DC684093415245E02b`}
                target="_blank"
                rel="noopener noreferrer"
                className="contract-link"
              >
                🔗 View on Etherscan
              </a>
            </div>
            <div className="contract-card">
              <h3>LogToken (ERC-721)</h3>
              <code>0xcd94B5a7d51D300f3C217C335e1046142eF4e3fF</code>
              <a
                href={`${ETHERSCAN_BASE}/address/0xcd94B5a7d51D300f3C217C335e1046142eF4e3fF`}
                target="_blank"
                rel="noopener noreferrer"
                className="contract-link"
              >
                🔗 View on Etherscan
              </a>
            </div>
            <div className="contract-card">
              <h3>Command Center Wallet</h3>
              <code>0x23e224b79344d96fc00Ce7BdE1D5552d720a027b</code>
              <a
                href={`${ETHERSCAN_BASE}/address/0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`}
                target="_blank"
                rel="noopener noreferrer"
                className="contract-link"
              >
                🔗 View on Etherscan
              </a>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="process-section">
          <h2>How It Works</h2>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-icon">📡</div>
              <h3>1. Data Collection</h3>
              <p>
                IoT sensors and drones send telemetry data via API or MQTT.
              </p>
            </div>

            <div className="process-step">
              <div className="step-icon">🔐</div>
              <h3>2. Hash Generation</h3>
              <p>
                Backend canonicalizes and hashes the data (SHA-256 for logs, Keccak256 for flights).
              </p>
            </div>

            <div className="process-step">
              <div className="step-icon">⛓️</div>
              <h3>3. Tokenization</h3>
              <p>
                Log hash is minted as ERC-721 NFT owned by device wallet or command center.
              </p>
            </div>

            <div className="process-step">
              <div className="step-icon">✅</div>
              <h3>4. Verification</h3>
              <p>
                Anyone can verify log integrity by checking the token on Etherscan.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Web3Process;
