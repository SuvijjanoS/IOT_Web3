import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = process.env.API_URL || 'https://web3iot.dhammada.com/api';

// 9 sensors: 3 lines × 3 positions (inlet, middle, outlet)
const SENSORS = [
  // Line 1
  { line: 1, position: 'inlet', sensorId: 'WW_L1_INLET' },
  { line: 1, position: 'middle', sensorId: 'WW_L1_MIDDLE' },
  { line: 1, position: 'outlet', sensorId: 'WW_L1_OUTLET' },
  // Line 2
  { line: 2, position: 'inlet', sensorId: 'WW_L2_INLET' },
  { line: 2, position: 'middle', sensorId: 'WW_L2_MIDDLE' },
  { line: 2, position: 'outlet', sensorId: 'WW_L2_OUTLET' },
  // Line 3
  { line: 3, position: 'inlet', sensorId: 'WW_L3_INLET' },
  { line: 3, position: 'middle', sensorId: 'WW_L3_MIDDLE' },
  { line: 3, position: 'outlet', sensorId: 'WW_L3_OUTLET' },
];

async function registerSensors() {
  console.log('📱 Registering 9 Wastewater Sensors');
  console.log('===================================\n');

  const registeredSensors = [];

  for (const sensor of SENSORS) {
    try {
      // Generate device registration data
      const deviceData = {
        manufacturer: 'IoT Solutions Inc',
        model: 'WW-2024',
        serial_number: sensor.sensorId,
        hardware_nonce: `HW${sensor.line.toString().padStart(3, '0')}${sensor.position.charAt(0).toUpperCase()}`
      };

      console.log(`Registering ${sensor.sensorId} (Line ${sensor.line}, ${sensor.position})...`);

      const response = await axios.post(`${API_URL}/devices`, deviceData, {
        headers: { 'Content-Type': 'application/json' }
      });

      registeredSensors.push({
        ...sensor,
        deviceId: response.data.deviceId,
        deviceWallet: response.data.deviceWallet
      });

      console.log(`  ✅ Registered: ${response.data.deviceId}`);
      console.log(`     Wallet: ${response.data.deviceWallet}\n`);

      // Small delay between registrations
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`  ❌ Failed to register ${sensor.sensorId}:`, error.response?.data || error.message);
    }
  }

  console.log('\n📋 Registration Summary:');
  console.log('=======================');
  registeredSensors.forEach(s => {
    console.log(`${s.sensorId}: ${s.deviceWallet}`);
  });

  return registeredSensors;
}

registerSensors().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

