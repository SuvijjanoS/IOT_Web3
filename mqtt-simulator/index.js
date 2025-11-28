import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const sensorId = process.env.SENSOR_ID || 'sensor_wq_001';

// Sample time series data (from requirements)
const sampleReadings = [
  {
    sensor_id: sensorId,
    ts: "2025-11-28T10:00:00Z",
    location: { lat: 13.7563, lng: 100.5018 },
    parameters: {
      ph: 7.2,
      temperature_c: 27.5,
      turbidity_ntu: 3.1,
      tds_mg_l: 220,
      dissolved_oxygen_mg_l: 6.8
    },
    battery_pct: 89,
    status: "OK"
  },
  {
    sensor_id: sensorId,
    ts: "2025-11-28T10:05:00Z",
    location: { lat: 13.7563, lng: 100.5018 },
    parameters: {
      ph: 7.3,
      temperature_c: 27.6,
      turbidity_ntu: 3.4,
      tds_mg_l: 221,
      dissolved_oxygen_mg_l: 6.7
    },
    battery_pct: 88,
    status: "OK"
  },
  {
    sensor_id: sensorId,
    ts: "2025-11-28T10:10:00Z",
    location: { lat: 13.7563, lng: 100.5018 },
    parameters: {
      ph: 7.4,
      temperature_c: 27.9,
      turbidity_ntu: 4.0,
      tds_mg_l: 224,
      dissolved_oxygen_mg_l: 6.5
    },
    battery_pct: 88,
    status: "OK"
  },
  {
    sensor_id: sensorId,
    ts: "2025-11-28T10:15:00Z",
    location: { lat: 13.7563, lng: 100.5018 },
    parameters: {
      ph: 7.8,
      temperature_c: 28.4,
      turbidity_ntu: 12.5,
      tds_mg_l: 260,
      dissolved_oxygen_mg_l: 5.2
    },
    battery_pct: 87,
    status: "ALERT_TURBIDITY"
  },
  {
    sensor_id: sensorId,
    ts: "2025-11-28T10:20:00Z",
    location: { lat: 13.7563, lng: 100.5018 },
    parameters: {
      ph: 7.9,
      temperature_c: 28.6,
      turbidity_ntu: 13.0,
      tds_mg_l: 265,
      dissolved_oxygen_mg_l: 5.0
    },
    battery_pct: 87,
    status: "ALERT_TURBIDITY"
  }
];

// Generate realistic variations
function generateReading(baseReading, index) {
  const variation = {
    ph: baseReading.parameters.ph + (Math.random() - 0.5) * 0.2,
    temperature_c: baseReading.parameters.temperature_c + (Math.random() - 0.5) * 0.5,
    turbidity_ntu: Math.max(0, baseReading.parameters.turbidity_ntu + (Math.random() - 0.5) * 2),
    tds_mg_l: baseReading.parameters.tds_mg_l + (Math.random() - 0.5) * 10,
    dissolved_oxygen_mg_l: Math.max(0, baseReading.parameters.dissolved_oxygen_mg_l + (Math.random() - 0.5) * 0.5)
  };
  
  return {
    ...baseReading,
    ts: new Date(Date.now() + index * 5 * 60 * 1000).toISOString(),
    parameters: variation,
    battery_pct: Math.max(0, baseReading.battery_pct - Math.floor(Math.random() * 2)),
    status: variation.turbidity_ntu > 10 ? "ALERT_TURBIDITY" : "OK"
  };
}

const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
  console.log(`Connected to MQTT broker: ${brokerUrl}`);
  console.log(`Publishing sensor data for: ${sensorId}`);
  
  const topic = `water/quality/${sensorId}`;
  let index = 0;
  
  // Publish initial sample readings
  console.log('Publishing sample readings...');
  sampleReadings.forEach((reading, i) => {
    setTimeout(() => {
      client.publish(topic, JSON.stringify(reading), { qos: 1 }, (err) => {
        if (err) {
          console.error('Failed to publish:', err);
        } else {
          console.log(`Published reading ${i + 1}/${sampleReadings.length}`);
        }
      });
    }, i * 2000); // 2 second intervals
  });
  
  // Continue publishing simulated readings every 30 seconds
  setTimeout(() => {
    console.log('Starting continuous simulation...');
    setInterval(() => {
      const reading = generateReading(sampleReadings[index % sampleReadings.length], index);
      client.publish(topic, JSON.stringify(reading), { qos: 1 }, (err) => {
        if (err) {
          console.error('Failed to publish:', err);
        } else {
          console.log(`Published simulated reading #${index + 1}`);
        }
      });
      index++;
    }, 30000); // Every 30 seconds
  }, sampleReadings.length * 2000 + 1000);
});

client.on('error', (error) => {
  console.error('MQTT error:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  client.end();
  process.exit(0);
});

