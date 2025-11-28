import axios from 'axios';
import crypto from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1/drone-logs';

// Generate a realistic DJI Mavic 3 flight log
function generateFlightLog() {
  const flightId = `FLIGHT_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const droneId = 'MAVIC3_001';
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() - 15); // Started 15 minutes ago

  const homeLat = 13.756331;
  const homeLon = 100.501765;
  const homeAlt = 2.5;

  const samples = [];
  const durationMs = 15000; // 15 seconds
  const sampleRate = 500; // 500ms = 2Hz
  const numSamples = Math.floor(durationMs / sampleRate);

  let currentLat = homeLat;
  let currentLon = homeLon;
  let currentHeight = 0.1;
  let currentYaw = 180;
  let battery = 99;
  let batteryVoltage = 16.7;

  for (let i = 0; i < numSamples; i++) {
    const tMs = i * sampleRate;
    const tSeconds = tMs / 1000;

    // Simulate takeoff and flight
    if (tSeconds < 3) {
      // Taking off
      currentHeight = Math.min(0.1 + tSeconds * 0.5, 2.0);
      currentLat = homeLat + (Math.random() - 0.5) * 0.00001;
      currentLon = homeLon + (Math.random() - 0.5) * 0.00001;
    } else if (tSeconds < 8) {
      // Climbing and moving forward
      currentHeight = 2.0 + (tSeconds - 3) * 3.5;
      const forwardDist = (tSeconds - 3) * 0.00005;
      currentLat = homeLat + forwardDist;
      currentLon = homeLon + (Math.random() - 0.5) * 0.00001;
      currentYaw = 180 + (Math.random() - 0.5) * 10;
    } else {
      // Hovering and maneuvering
      currentHeight = 18.0 + Math.sin(tSeconds * 0.5) * 2;
      currentLat = homeLat + 0.0002 + Math.sin(tSeconds * 0.3) * 0.0001;
      currentLon = homeLon + 0.0001 + Math.cos(tSeconds * 0.3) * 0.0001;
      currentYaw = 180 + Math.sin(tSeconds * 0.2) * 30;
    }

    const hSpeed = tSeconds < 3 ? 0 : Math.min(7.0, (tSeconds - 3) * 1.5);
    const vSpeed = tSeconds < 3 ? 1.6 : (Math.random() - 0.5) * 0.5;

    battery = Math.max(96, battery - (Math.random() * 0.1));
    batteryVoltage = Math.max(16.0, batteryVoltage - (Math.random() * 0.05));

    samples.push({
      t_ms: tMs,
      lat: Number(currentLat.toFixed(7)),
      lon: Number(currentLon.toFixed(7)),
      height_agl_m: Number(currentHeight.toFixed(2)),
      alt_asl_m: Number((homeAlt + currentHeight).toFixed(2)),
      pitch_deg: Number((Math.sin(tSeconds * 0.5) * 5).toFixed(1)),
      roll_deg: Number((Math.cos(tSeconds * 0.3) * 2.5).toFixed(1)),
      yaw_deg: Number(currentYaw.toFixed(1)),
      vx_ms: Number((hSpeed * Math.cos((currentYaw * Math.PI) / 180)).toFixed(3)),
      vy_ms: Number((hSpeed * Math.sin((currentYaw * Math.PI) / 180)).toFixed(3)),
      vz_ms: Number(vSpeed.toFixed(3)),
      h_speed_ms: Number(hSpeed.toFixed(3)),
      gps_level: tSeconds < 2 ? 4 : 5,
      gps_sats: Math.floor(17 + Math.random() * 4),
      flight_mode: 'P-GPS',
      rc_aileron_pct: Number((Math.sin(tSeconds * 0.5) * 20).toFixed(1)),
      rc_elevator_pct: Number((Math.cos(tSeconds * 0.5) * 60).toFixed(1)),
      rc_throttle_pct: Number((50 + Math.sin(tSeconds * 0.3) * 20).toFixed(1)),
      rc_rudder_pct: Number((Math.sin(tSeconds * 0.4) * 40).toFixed(1)),
      battery_pct: Math.floor(battery),
      battery_voltage_v: Number(batteryVoltage.toFixed(2)),
      warnings: [],
      event_flags: {
        photo_taken: tSeconds > 9 && tSeconds < 10,
        video_rec: true,
        rth_active: false
      }
    });
  }

  return {
    flight_id: flightId,
    drone_id: droneId,
    drone_model: 'DJI Mavic 3',
    started_at_utc: startTime.toISOString(),
    firmware_version: '01.01.1200',
    app_name: 'DJI Fly',
    app_version: '1.15.0',
    home_point: {
      lat: homeLat,
      lon: homeLon,
      alt_asl_m: homeAlt
    },
    samples_hz: 2,
    samples: samples
  };
}

async function submitFlightLog() {
  try {
    const flightLog = generateFlightLog();
    console.log(`Submitting flight log: ${flightLog.flight_id}`);
    console.log(`Samples: ${flightLog.samples.length}`);

    const response = await axios.post(API_URL, flightLog, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Flight log submitted successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Failed to submit flight log:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  submitFlightLog();
}

export { generateFlightLog, submitFlightLog };

