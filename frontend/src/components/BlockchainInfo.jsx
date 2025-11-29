import React, { useState, useEffect } from 'react';
import { getAllDevices } from '../api';
import './BlockchainInfo.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

function BlockchainInfo() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState({
    deviceRegistry: '0x38933cf220E8c352D1bcC7DC684093415245E02b',
    logToken: '0xcd94B5a7d51D300f3C217C335e1046142eF4e3fF',
    commandCenterWallet: '0x23e224b79344d96fc00Ce7BdE1D5552d720a027b'
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await getAllDevices();
      setDevices(response.data || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDeviceId = (deviceId) => {
    if (!deviceId) return 'N/A';
    if (typeof deviceId === 'string' && deviceId.startsWith('0x')) {
      return `${deviceId.substring(0, 10)}...${deviceId.substring(deviceId.length - 8)}`;
    }
    return deviceId;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="blockchain-info">
      <div className="info-header">
        <h2>🔗 Blockchain & Device Information</h2>
        <p>View contract addresses, device wallets, and blockchain confirmations</p>
      </div>

      <div className="info-sections">
        {/* Smart Contracts */}
        <section className="info-section">
          <h3>📜 Smart Contracts</h3>
          <div className="contract-grid">
            <div className="contract-card">
              <div className="contract-header">
                <h4>DeviceRegistry</h4>
                <span className="contract-badge">Contract</span>
              </div>
              <div className="contract-address">
                <code>{contracts.deviceRegistry}</code>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(contracts.deviceRegistry)}
                  title="Copy address"
                >
                  📋
                </button>
              </div>
              <a
                href={`${ETHERSCAN_BASE}/address/${contracts.deviceRegistry}`}
                target="_blank"
                rel="noopener noreferrer"
                className="etherscan-link"
              >
                🔗 View on Etherscan
              </a>
            </div>

            <div className="contract-card">
              <div className="contract-header">
                <h4>LogToken (ERC-721)</h4>
                <span className="contract-badge">NFT Contract</span>
              </div>
              <div className="contract-address">
                <code>{contracts.logToken}</code>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(contracts.logToken)}
                  title="Copy address"
                >
                  📋
                </button>
              </div>
              <a
                href={`${ETHERSCAN_BASE}/address/${contracts.logToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="etherscan-link"
              >
                🔗 View on Etherscan
              </a>
            </div>

            <div className="contract-card">
              <div className="contract-header">
                <h4>Command Center Wallet</h4>
                <span className="contract-badge">Wallet</span>
              </div>
              <div className="contract-address">
                <code>{contracts.commandCenterWallet}</code>
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(contracts.commandCenterWallet)}
                  title="Copy address"
                >
                  📋
                </button>
              </div>
              <a
                href={`${ETHERSCAN_BASE}/address/${contracts.commandCenterWallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="etherscan-link"
              >
                🔗 View on Etherscan
              </a>
            </div>
          </div>
        </section>

        {/* Registered Devices */}
        <section className="info-section">
          <h3>📱 Registered IoT Devices</h3>
          {loading ? (
            <div className="loading">Loading devices...</div>
          ) : devices.length === 0 ? (
            <div className="no-data">No devices registered yet</div>
          ) : (
            <div className="devices-table">
              <table>
                <thead>
                  <tr>
                    <th>Device ID</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Serial Number</th>
                    <th>Wallet Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.id}>
                      <td>
                        <code className="device-id" title={device.deviceId}>
                          {formatDeviceId(device.deviceId)}
                        </code>
                      </td>
                      <td>{device.manufacturer || 'N/A'}</td>
                      <td>{device.model || 'N/A'}</td>
                      <td>{device.serialNumber || 'N/A'}</td>
                      <td>
                        <code className="wallet-address" title={device.deviceWallet}>
                          {device.deviceWallet ? `${device.deviceWallet.substring(0, 8)}...${device.deviceWallet.substring(device.deviceWallet.length - 6)}` : 'N/A'}
                        </code>
                        {device.deviceWallet && (
                          <button 
                            className="copy-btn-small"
                            onClick={() => copyToClipboard(device.deviceWallet)}
                            title="Copy wallet address"
                          >
                            📋
                          </button>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${device.isActive ? 'active' : 'inactive'}`}>
                          {device.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {device.deviceWallet && (
                          <a
                            href={`${ETHERSCAN_BASE}/address/${device.deviceWallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="etherscan-link-small"
                          >
                            🔗 View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Network Info */}
        <section className="info-section">
          <h3>🌐 Network Information</h3>
          <div className="network-info">
            <div className="info-item">
              <span className="info-label">Network:</span>
              <span className="info-value">Sepolia Testnet</span>
            </div>
            <div className="info-item">
              <span className="info-label">Explorer:</span>
              <a 
                href="https://sepolia.etherscan.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="info-link"
              >
                Sepolia Etherscan
              </a>
            </div>
            <div className="info-item">
              <span className="info-label">Total Devices:</span>
              <span className="info-value">{devices.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Active Devices:</span>
              <span className="info-value">{devices.filter(d => d.isActive).length}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default BlockchainInfo;

