import axios from 'axios';

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
  ph: {
    inlet: { min: 6.5, max: 8.0 },
    middle: { min: 6.8, max: 7.8 },
    outlet: { min: 7.0, max: 7.5 }
  },
  temperature_c: {
    inlet: { min: 18, max: 28 },
    middle: { min: 20, max: 26 },
    outlet: { min: 20, max: 25 }
  },
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

  const hoursSinceStart = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);
  const timeVariation = Math.sin(hoursSinceStart * 0.1) * 0.2;

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
  console.log('💧 Generating Wastewater Sensor Readings (Fast Mode)');
  console.log('===================================================\n');

  const now = new Date();
  const startTime = new Date(now);
  startTime.setDate(startTime.getDate() - 3);
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);

  let totalReadings = 0;
  let successCount = 0;
  let errorCount = 0;

  // Generate all readings first, then submit in parallel batches
  const allReadings = [];
  for (const sensorId of SENSORS) {
    for (let hour = 0; hour < 72; hour++) {
      const readingTime = new Date(startTime);
      readingTime.setHours(readingTime.getHours() + hour);
      allReadings.push({ sensorId, reading: generateReading(sensorId, readingTime) });
    }
  }

  console.log(`Generated ${allReadings.length} readings. Submitting in batches...\n`);

  // Submit in batches of 10 to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < allReadings.length; i += batchSize) {
    const batch = allReadings.slice(i, i + batchSize);
    
    const promises = batch.map(async ({ sensorId, reading }) => {
      try {
        await axios.post(API_URL, reading, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        });
        return { success: true, sensorId };
      } catch (error) {
        return { success: false, sensorId, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    
    results.forEach(result => {
      totalReadings++;
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    });

    // Progress update
    if (i % 100 === 0 || i === allReadings.length - batchSize) {
      const progress = ((i + batch.length) / allReadings.length * 100).toFixed(1);
      console.log(`Progress: ${progress}% (${i + batch.length}/${allReadings.length}) - Success: ${successCount}, Failed: ${errorCount}`);
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
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

