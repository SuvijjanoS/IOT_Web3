import React from 'react';
import './BlockchainStatus.css';

function BlockchainStatus({ status, txHash, blockNumber }) {
  if (!status || status === 'PENDING') {
    return (
      <div className="blockchain-status pending">
        <span className="status-icon">⏳</span>
        <span className="status-text">Blockchain: Pending</span>
        <span className="status-note" title="Contracts are deployed. Tokenization will happen automatically on next processing.">
          (Contracts Deployed - Processing)
        </span>
      </div>
    );
  }

  if (status === 'ON_CHAIN' && txHash) {
    return (
      <div className="blockchain-status on-chain">
        <span className="status-icon">✅</span>
        <span className="status-text">Blockchain: Verified</span>
        <a
          href={`https://sepolia.etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="blockchain-link"
        >
          View on Etherscan
        </a>
        {blockNumber && (
          <a
            href={`https://sepolia.etherscan.io/block/${blockNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block-link"
          >
            Block #{blockNumber}
          </a>
        )}
      </div>
    );
  }

  return null;
}

export default BlockchainStatus;

