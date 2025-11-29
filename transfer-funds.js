#!/usr/bin/env node

/**
 * URGENT: Transfer funds from exposed wallet to secure wallet
 * 
 * Usage: node transfer-funds.js <secure_wallet_address>
 * 
 * WARNING: This wallet's private key is exposed in the repository!
 * Only use this script to transfer funds to a secure wallet.
 */

const { ethers } = require('ethers');

// EXPOSED WALLET (DO NOT USE FOR REAL FUNDS)
const EXPOSED_PRIVATE_KEY = '0x6711b077487812528c62e1d2ed4cd457cff2f4bfe0d440bbc13aa6f1e23ee27c';
const EXPOSED_ADDRESS = '0x23e224b79344d96fc00Ce7BdE1D5552d720a027b';

// Mainnet provider
const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');

async function transferFunds(secureAddress) {
  console.log('⚠️  SECURITY WARNING ⚠️');
  console.log('This wallet\'s private key is EXPOSED in the repository!');
  console.log('Only use this to transfer funds to a secure wallet.\n');
  
  if (!secureAddress || !ethers.isAddress(secureAddress)) {
    console.error('❌ Invalid secure wallet address provided');
    console.log('Usage: node transfer-funds.js <secure_wallet_address>');
    process.exit(1);
  }
  
  const wallet = new ethers.Wallet(EXPOSED_PRIVATE_KEY, provider);
  
  console.log('Exposed Wallet:', EXPOSED_ADDRESS);
  console.log('Secure Wallet:', secureAddress);
  console.log('');
  
  try {
    const balance = await provider.getBalance(EXPOSED_ADDRESS);
    const balanceEth = ethers.formatEther(balance);
    
    console.log('Current Balance:', balanceEth, 'ETH');
    
    if (parseFloat(balanceEth) === 0) {
      console.log('✅ No funds to transfer');
      return;
    }
    
    // Estimate gas
    const gasPrice = await provider.getFeeData();
    const gasLimit = 21000; // Standard ETH transfer
    
    const gasCost = gasPrice.gasPrice * BigInt(gasLimit);
    const gasCostEth = ethers.formatEther(gasCost);
    
    const transferAmount = balance - gasCost;
    const transferAmountEth = ethers.formatEther(transferAmount);
    
    if (transferAmount <= 0) {
      console.error('❌ Insufficient balance to cover gas fees');
      console.log('Need at least', gasCostEth, 'ETH for gas');
      return;
    }
    
    console.log('Gas Cost:', gasCostEth, 'ETH');
    console.log('Transfer Amount:', transferAmountEth, 'ETH');
    console.log('');
    
    // Ask for confirmation
    console.log('⚠️  About to transfer', transferAmountEth, 'ETH');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Sending transaction...');
    
    const tx = await wallet.sendTransaction({
      to: secureAddress,
      value: transferAmount,
      gasLimit: gasLimit,
      gasPrice: gasPrice.gasPrice
    });
    
    console.log('✅ Transaction sent!');
    console.log('Tx Hash:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed!');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas Used:', receipt.gasUsed.toString());
    console.log('');
    console.log('✅ Funds transferred successfully!');
    console.log('✅ Please secure your new wallet and never expose its private key!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.reason) {
      console.error('Reason:', error.reason);
    }
    process.exit(1);
  }
}

const secureAddress = process.argv[2];
transferFunds(secureAddress).catch(console.error);

