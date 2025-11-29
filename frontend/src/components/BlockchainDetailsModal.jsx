import React, { useState, useEffect } from 'react';
import { getDevice, getFlightById } from '../api';
import './BlockchainDetailsModal.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

function BlockchainDetailsModal({ flightId, droneId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState(null);
  const [flight, setFlight] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    loadData();
  }, [flightId, droneId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get flight info first
      if (flightId) {
        const flightResponse = await getFlightById(flightId);
        setFlight(flightResponse.data);
        
        // Try to find device by drone_id (drones may not be registered as devices yet)
        // For now, we'll show flight info even if device is not found
        if (droneId) {
          try {
            // Try to get device - but drone_id might not be a deviceId
            // In production, you'd have a mapping table
            const deviceResponse = await getDevice(droneId);
            if (deviceResponse.data) {
              setDevice(deviceResponse.data);
              
              // Get wallet balance
              if (deviceResponse.data.deviceWallet) {
                try {
                  const { ethers } = await import('ethers');
                  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g');
                  const balance = await provider.getBalance(deviceResponse.data.deviceWallet);
                  setWalletBalance(ethers.formatEther(balance));
                } catch (e) {
                  console.error('Failed to get balance:', e);
                }
              }
            }
          } catch (e) {
            // Device not found - this is OK, drones may not be registered as devices
            console.log('Device not registered for this drone:', droneId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    if (typeof hash === 'string' && hash.startsWith('0x')) {
      return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
    }
    return hash;
  };

  const getLogHash = () => {
    if (flight?.log_hash) {
      if (Buffer.isBuffer(flight.log_hash)) {
        return '0x' + flight.log_hash.toString('hex');
      }
      return flight.log_hash;
    }
    return null;
  };

  return (
    <div className="blockchain-modal-overlay" onClick={onClose}>
      <div className="blockchain-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔗 Blockchain Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="modal-loading">Loading...</div>
        ) : (
          <div className="modal-content">
            {/* Device/Wallet Info */}
            {device && (
              <section className="detail-section">
                <h3>Device & Wallet Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Device ID:</span>
                    <code className="value">{formatHash(device.deviceId)}</code>
                  </div>
                  <div className="info-item">
                    <span className="label">Wallet Address:</span>
                    <div className="value-with-link">
                      <code>{device.deviceWallet}</code>
                      <a
                        href={`${ETHERSCAN_BASE}/address/${device.deviceWallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="etherscan-link"
                      >
                        🔗 View on Etherscan
                      </a>
                    </div>
                  </div>
                  {walletBalance !== null && (
                    <div className="info-item">
                      <span className="label">Wallet Balance:</span>
                      <span className="value">{parseFloat(walletBalance).toFixed(4)} ETH</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="label">Manufacturer:</span>
                    <span className="value">{device.manufacturer || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Model:</span>
                    <span className="value">{device.model || 'N/A'}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Flight Log Info */}
            {flight && (
              <section className="detail-section">
                <h3>Flight Log Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Flight ID:</span>
                    <code className="value">{flight.flight_id}</code>
                  </div>
                  <div className="info-item">
                    <span className="label">Log Hash:</span>
                    <div className="value-with-link">
                      <code>{formatHash(getLogHash())}</code>
                      <button
                        className="copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(getLogHash() || '');
                          alert('Hash copied to clipboard!');
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${flight.tokenization_status?.toLowerCase()}`}>
                      {flight.tokenization_status || 'PENDING'}
                    </span>
                  </div>
                  {flight.tx_hash && (
                    <>
                      <div className="info-item">
                        <span className="label">Transaction Hash:</span>
                        <div className="value-with-link">
                          <code>{formatHash(flight.tx_hash)}</code>
                          <a
                            href={`${ETHERSCAN_BASE}/tx/${flight.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="etherscan-link"
                          >
                            🔗 View Transaction
                          </a>
                        </div>
                      </div>
                      {flight.block_number && (
                        <div className="info-item">
                          <span className="label">Block Number:</span>
                          <div className="value-with-link">
                            <span className="value">{flight.block_number}</span>
                            <a
                              href={`${ETHERSCAN_BASE}/block/${flight.block_number}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="etherscan-link"
                            >
                              🔗 View Block
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Tokenization Info */}
            <section className="detail-section">
              <h3>Tokenization Process</h3>
              <div className="process-info">
                {flight?.tokenization_status === 'PENDING' ? (
                  <div className="pending-info">
                    <p>⏳ <strong>Status: Pending Tokenization</strong></p>
                    <p>The flight log is recorded but not yet tokenized on blockchain.</p>
                    <p>Tokenization will happen automatically when:</p>
                    <ul>
                      <li>Contracts are deployed and initialized</li>
                      <li>Device wallet has sufficient ETH for gas</li>
                      <li>Backend processes the log</li>
                    </ul>
                    <p><strong>Master Wallet:</strong> <code>0x23e224b79344d96fc00Ce7BdE1D5552d720a027b</code></p>
                    <a
                      href={`${ETHERSCAN_BASE}/address/0x23e224b79344d96fc00Ce7BdE1D5552d720a027b`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="etherscan-link"
                    >
                      🔗 View Master Wallet on Etherscan
                    </a>
                    {!device && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff3cd', borderRadius: '6px' }}>
                        <p style={{ margin: 0, color: '#856404' }}>
                          <strong>Note:</strong> This drone needs to be registered as a device in the DeviceRegistry contract before tokenization can occur.
                        </p>
                      </div>
                    )}
                  </div>
                ) : flight?.tokenization_status === 'ON_CHAIN' ? (
                  <div className="confirmed-info">
                    <p>✅ <strong>Status: Tokenized on Blockchain</strong></p>
                    <p>The flight log has been successfully tokenized as an ERC-721 NFT.</p>
                    <p>You can verify the transaction on Sepolia Etherscan.</p>
                  </div>
                ) : (
                  <div className="info-text">
                    <p>Blockchain tokenization ensures data integrity and tamper-proof verification.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlockchainDetailsModal;

