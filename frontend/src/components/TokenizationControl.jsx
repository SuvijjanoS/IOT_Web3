import React, { useState } from 'react';
import api from '../api';
import './TokenizationControl.css';

const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

function TokenizationControl() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleRetryReadings = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await api.post('/retry-tokenization/readings', { limit: 50 });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to retry tokenization');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFlights = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await api.post('/retry-tokenization/flights', { limit: 50 });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to retry tokenization');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryAll = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await api.post('/retry-tokenization/all', { limit: 50 });
      setResults(response.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to retry tokenization');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateReading = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await api.post('/simulate/reading');
      setResults({
        type: 'simulation',
        category: 'reading',
        ...response.data
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to simulate reading');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateFlight = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const response = await api.post('/simulate/flight');
      setResults({
        type: 'simulation',
        category: 'flight',
        ...response.data
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to simulate flight');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tokenization-control">
      <div className="control-header">
        <h1>🔗 Tokenization Control Panel</h1>
        <p className="subtitle">Retry pending tokenizations and simulate test logs</p>
      </div>

      <div className="control-content">
        {/* Retry Section */}
        <section className="control-section">
          <h2>🔄 Retry Pending Tokenizations</h2>
          <p className="section-description">
            Retry tokenization for readings and flights that are still pending on-chain.
          </p>
          
          <div className="button-group">
            <button
              className="action-btn retry-btn"
              onClick={handleRetryReadings}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : '🔄 Retry Pending Readings'}
            </button>
            
            <button
              className="action-btn retry-btn"
              onClick={handleRetryFlights}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : '🔄 Retry Pending Flights'}
            </button>
            
            <button
              className="action-btn retry-btn retry-all-btn"
              onClick={handleRetryAll}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : '🔄 Retry All Pending'}
            </button>
          </div>
        </section>

        {/* Simulation Section */}
        <section className="control-section">
          <h2>🧪 Simulate & Tokenize</h2>
          <p className="section-description">
            Create test logs, tokenize them immediately, and post to blockchain.
          </p>
          
          <div className="button-group">
            <button
              className="action-btn simulate-btn"
              onClick={handleSimulateReading}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : '🧪 Simulate Water Quality Reading'}
            </button>
            
            <button
              className="action-btn simulate-btn"
              onClick={handleSimulateFlight}
              disabled={loading}
            >
              {loading ? '⏳ Processing...' : '🧪 Simulate Drone Flight'}
            </button>
          </div>
        </section>

        {/* Results Section */}
        {error && (
          <div className="result-section error">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {results && (
          <div className="result-section success">
            <h3>✅ Results</h3>
            
            {results.type === 'simulation' ? (
              <div className="simulation-results">
                {results.category === 'reading' ? (
                  <>
                    <div className="result-item">
                      <span className="label">Reading ID:</span>
                      <span className="value">{results.readingId}</span>
                    </div>
                    <div className="result-item">
                      <span className="label">Token ID:</span>
                      <span className="value">{results.tokenId}</span>
                    </div>
                    <div className="result-item">
                      <span className="label">Transaction Hash:</span>
                      <div className="value-with-link">
                        <code>{results.txHash}</code>
                        <a
                          href={`${ETHERSCAN_BASE}/tx/${results.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="etherscan-link"
                        >
                          🔗 View on Etherscan
                        </a>
                      </div>
                    </div>
                    <div className="result-item">
                      <span className="label">Block Number:</span>
                      <a
                        href={`${ETHERSCAN_BASE}/block/${results.blockNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block-link"
                      >
                        Block #{results.blockNumber}
                      </a>
                    </div>
                    <div className="result-item">
                      <span className="label">Test Reading:</span>
                      <pre className="json-preview">{JSON.stringify(results.reading, null, 2)}</pre>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="result-item">
                      <span className="label">Flight ID:</span>
                      <span className="value">{results.flightId}</span>
                    </div>
                    <div className="result-item">
                      <span className="label">Status:</span>
                      <span className={`status-badge ${results.tokenization_status?.toLowerCase()}`}>
                        {results.tokenization_status}
                      </span>
                    </div>
                    <div className="result-item">
                      <span className="label">Log Hash:</span>
                      <code>{results.log_hash}</code>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="retry-results">
                {results.readings && (
                  <div className="result-group">
                    <h4>📊 Readings</h4>
                    <div className="stats">
                      <div className="stat">
                        <span className="stat-label">Processed:</span>
                        <span className="stat-value">{results.readings.processed}</span>
                      </div>
                      <div className="stat success">
                        <span className="stat-label">Succeeded:</span>
                        <span className="stat-value">{results.readings.succeeded}</span>
                      </div>
                      <div className="stat error">
                        <span className="stat-label">Failed:</span>
                        <span className="stat-value">{results.readings.failed}</span>
                      </div>
                    </div>
                    {results.readings.errors.length > 0 && (
                      <div className="errors-list">
                        <strong>Errors:</strong>
                        <ul>
                          {results.readings.errors.slice(0, 5).map((err, idx) => (
                            <li key={idx}>{err.sensor_id || err.id}: {err.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {results.flights && (
                  <div className="result-group">
                    <h4>🛸 Flights</h4>
                    <div className="stats">
                      <div className="stat">
                        <span className="stat-label">Processed:</span>
                        <span className="stat-value">{results.flights.processed}</span>
                      </div>
                      <div className="stat success">
                        <span className="stat-label">Succeeded:</span>
                        <span className="stat-value">{results.flights.succeeded}</span>
                      </div>
                      <div className="stat error">
                        <span className="stat-label">Failed:</span>
                        <span className="stat-value">{results.flights.failed}</span>
                      </div>
                    </div>
                    {results.flights.errors.length > 0 && (
                      <div className="errors-list">
                        <strong>Errors:</strong>
                        <ul>
                          {results.flights.errors.slice(0, 5).map((err, idx) => (
                            <li key={idx}>{err.flight_id}: {err.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {results.total && (
                  <div className="result-group total">
                    <h4>📈 Total</h4>
                    <div className="stats">
                      <div className="stat">
                        <span className="stat-label">Processed:</span>
                        <span className="stat-value">{results.total.processed}</span>
                      </div>
                      <div className="stat success">
                        <span className="stat-label">Succeeded:</span>
                        <span className="stat-value">{results.total.succeeded}</span>
                      </div>
                      <div className="stat error">
                        <span className="stat-label">Failed:</span>
                        <span className="stat-value">{results.total.failed}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TokenizationControl;

