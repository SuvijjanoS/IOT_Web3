import axios from 'axios';
import crypto from 'crypto';

const API_BASE = process.env.API_URL || 'https://web3iot.dhammada.com/api';
const API_URL = `${API_BASE}/v1/sensor-readings`;

// 9 sensors
const SENSORS = [
  'WW_L1_INLET', 'WW_L1_MIDDLE', 'WW_L1_OUTLET',
  'WW_L2_INLET', 'WW_L2_MIDDLE', 'WW_L2_OUTLET',
  'WW_L3_INLET', 'WW_L3_MIDDLE', 'WW_L3_OUTLET',
];

// Realistic ranges for wastewater treatment
const PARAMETER_RANGES = {
  // pH: wastewater typically 6.5-8.5, treated water closer to 7.0-7.5
  ph: {
    inlet: { min: 6.5, max: 8.0 },
    middle: { min: 6.8, max: 7.8 },
    outlet: { min: 7.0, max: 7.5 }
  },
  // Temperature: wastewater typically 15-30°C
  temperature_c: {
    inlet: { min: 18, max: 28 },
    middle: { min: 20, max: 26 },
    outlet: { min: 20, max: 25 }
  },
  // Flow rate: L/min (varies by line and position)
  flow_rate_lpm: {
    inlet: { min: 500, max: 2000 },
    middle: { min: 450, max: 1900 },
    outlet: { min: 400, max: 1800 }
  }
};

function getParameterRange(sensorId, paramName) {
  const position = sensorId.includes('INLET') ? 'inlet' : 
                   sensorId.includes('MIDDLE') ? 'middle' : 'outlet';
  return PARAMETER_RANGES[paramName][position];
}

function generateReading(sensorId, timestamp) {
  const phRange = getParameterRange(sensorId, 'ph');
  const tempRange = getParameterRange(sensorId, 'temperature_c');
  const flowRange = getParameterRange(sensorId, 'flow_rate_lpm');

  // Add some realistic variation (slight trends over time)
  const hoursSinceStart = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
  const timeVariation = Math.sin(hoursSinceStart * 0.1) * 0.2; // Slow oscillation

  const ph = phRange.min + (phRange.max - phRange.min) * (0.5 + timeVariation) + (Math.random() - 0.5) * 0.3;
  const temperature = tempRange.min + (tempRange.max - tempRange.min) * (0.5 + timeVariation * 0.5) + (Math.random() - 0.5) * 2;
  const flowRate = flowRange.min + (flowRange.max - flowRange.min) * (0.5 + Math.random() * 0.3);

  return {
    sensor_id: sensorId,
    ts: timestamp.toISOString(),
    parameters: {
      ph: parseFloat(ph.toFixed(2)),
      temperature_c: parseFloat(temperature.toFixed(2)),
      flow_rate_lpm: parseFloat(flowRate.toFixed(2))
    },
    battery_pct: 85 + Math.floor(Math.random() * 15),
    status: 'OK',
    location: {
      lat: 13.7563 + (Math.random() - 0.5) * 0.01,
      lng: 100.5018 + (Math.random() - 0.5) * 0.01
    }
  };
}

async function generateReadings() {
  console.log('💧 Generating Wastewater Sensor Readings');
  console.log('========================================\n');
  console.log('Configuration:');
  console.log(`  - Sensors: ${SENSORS.length}`);
  console.log(`  - Duration: 3 days`);
  console.log(`  - Frequency: Every hour`);
  console.log(`  - Readings per sensor: 72`);
  console.log(`  - Total readings: ${SENSORS.length * 72}\n`);

  // Calculate start time (3 days ago)
  const now = new Date();
  const startTime = new Date(now);
  startTime.setDate(startTime.getDate() - 3);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);

  let totalReadings = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const sensorId of SENSORS) {
    console.log(`\n📊 Generating readings for ${sensorId}...`);
    let sensorSuccess = 0;
    let sensorErrors = 0;

    // Generate 72 readings (one per hour for 3 days)
    for (let hour = 0; hour < 72; hour++) {
      const readingTime = new Date(startTime);
      readingTime.setHours(readingTime.getHours() + hour);

      const reading = generateReading(sensorId, readingTime);

      try {
        const response = await axios.post(API_URL, reading, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000 // Increased timeout for tokenization
        });

        sensorSuccess++;
        successCount++;
        totalReadings++;

        if (hour % 12 === 0 || sensorSuccess % 10 === 0) {
          console.log(`  ✅ Hour ${hour}: Reading recorded (${reading.parameters.ph.toFixed(2)} pH, ${reading.parameters.temperature_c.toFixed(1)}°C, ${reading.parameters.flow_rate_lpm.toFixed(1)} L/min)`);
        }
      } catch (error) {
        sensorErrors++;
        errorCount++;
        // Only log errors occasionally to reduce noise
        if (hour % 12 === 0 || sensorErrors <= 3) {
          console.error(`  ❌ Hour ${hour}: Failed - ${error.response?.data?.error || error.message}`);
        }
        
        // Retry once after a delay
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            const retryResponse = await axios.post(API_URL, reading, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 60000
            });
            sensorSuccess++;
            successCount++;
            totalReadings++;
            sensorErrors--;
            errorCount--;
            console.log(`  ✅ Hour ${hour}: Retry succeeded`);
          } catch (retryError) {
            // Retry failed, continue
          }
        }
      }

      // Delay between requests to avoid overwhelming the API and blockchain
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between readings
    }

    console.log(`  📈 ${sensorId}: ${sensorSuccess} succeeded, ${sensorErrors} failed`);
  }

  console.log('\n✅ Generation Complete!');
  console.log('=======================');
  console.log(`Total readings: ${totalReadings}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
}

generateReadings().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

