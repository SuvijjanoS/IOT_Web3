#!/bin/bash
# Quick script to check Sepolia balance

ADDRESS="0x23e224b79344d96fc00Ce7BdE1D5552d720a027b"
RPC_URL="https://eth-sepolia.g.alchemy.com/v2/pYxkSp7pwP6Z9fSgHgs8g"

node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('${RPC_URL}');
const address = '${ADDRESS}';

provider.getBalance(address).then(balance => {
  const eth = parseFloat(ethers.formatEther(balance));
  console.log('🔍 Sepolia Balance Check');
  console.log('═══════════════════════════');
  console.log('Address:', address);
  console.log('Balance:', eth, 'ETH');
  console.log('');
  
  if (eth >= 0.01) {
    console.log('✅ Sufficient balance for contract deployment!');
    console.log('✅ Run: ./deploy-all-contracts.sh');
  } else if (eth > 0) {
    console.log('⚠️  Low balance - may need more for deployment');
    console.log('   Recommended: ≥0.01 ETH');
  } else {
    console.log('❌ No Sepolia ETH - need to get from faucet');
    console.log('');
    console.log('💡 Try these faucets:');
    console.log('   1. PoW Faucet: https://sepolia-faucet.pk910.de/');
    console.log('   2. QuickNode: https://faucet.quicknode.com/ethereum/sepolia');
    console.log('   3. Alchemy: https://www.alchemy.com/faucets/ethereum/sepolia');
  }
});
"

