import axios from 'axios';
import crypto from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1/drone-logs';

// Realistic GPS coordinates for locations
const LOCATIONS = {
  'Bangkok Victory Monument': {
    lat: 13.7649,
    lon: 100.5383,
    alt_asl: 12.0, // Approximate ground elevation
    description: 'Bangkok Victory Monument area'
  },
  'PTTEP Songkhla': {
    lat: 7.2069,
    lon: 100.5967,
    alt_asl: 8.0,
    description: 'PTTEP Songkhla base asset'
  },
  'Energy Complex Bangkok': {
    lat: 13.7200,
    lon: 100.5300,
    alt_asl: 15.0,
    description: 'Energy Complex building, Bangkok'
  },
  'Hatyai City': {
    lat: 7.0083,
    lon: 100.4767,
    alt_asl: 10.0,
    description: 'Hatyai city center'
  },
  'Chiangrai City': {
    lat: 19.9100,
    lon: 99.8317,
    alt_asl: 390.0, // Higher elevation in northern Thailand
    description: 'Chiangrai city area'
  }
};

// Generate realistic Mavic 3 Enterprise flight log
function generateMavic3EnterpriseFlight(locationName, location, flightNumber) {
  const locationData = LOCATIONS[locationName];
  const flightId = `MAVIC3E_FLIGHT_${locationName.replace(/\s+/g, '_').toUpperCase()}_${flightNumber}_${Date.now()}`;
  const droneId = 'MAVIC3E_001';
  
  // Start time: random time in the past week
  const startedAt = new Date();
  startedAt.setDate(startedAt.getDate() - Math.floor(Math.random() * 7));
  startedAt.setHours(8 + Math.floor(Math.random() * 10)); // 8 AM to 6 PM
  startedAt.setMinutes(Math.floor(Math.random() * 60));
  
  const homeLat = locationData.lat;
  const homeLon = locationData.lon;
  const homeAltAsl = locationData.alt_asl;
  
  // Flight parameters
  const durationSeconds = 30 * 60; // 30 minutes
  const sampleRateMs = 2000; // 0.5 Hz sampling (reduced to keep payload < 1MB)
  const numSamples = Math.floor((durationSeconds * 1000) / sampleRateMs);
  const targetSpeed = 10.0; // m/s
  const targetAltitudeMin = 80.0; // meters AGL
  const targetAltitudeMax = 100.0; // meters AGL
  
  const samples = [];
  let currentLat = homeLat;
  let currentLon = homeLon;
  let currentHeightAgl = 0.1;
  let currentAltAsl = homeAltAsl + 0.1;
  let currentYaw = 0; // degrees
  let battery = 100;
  let batteryVoltage = 17.6; // Mavic 3 Enterprise uses 4S battery
  
  // Flight phases
  const takeoffDuration = 15; // seconds
  const cruiseStart = takeoffDuration;
  const landingStart = durationSeconds - 30; // Start landing 30 seconds before end
  
  for (let i = 0; i < numSamples; i++) {
    const tMs = i * sampleRateMs;
    const tSeconds = tMs / 1000;
    
    // Phase 1: Takeoff (0-15 seconds)
    if (tSeconds < takeoffDuration) {
      const takeoffProgress = tSeconds / takeoffDuration;
      currentHeightAgl = 0.1 + (targetAltitudeMin * 0.8) * takeoffProgress;
      currentAltAsl = homeAltAsl + currentHeightAgl;
      // Minimal horizontal movement during takeoff
      currentLat = homeLat + (Math.random() - 0.5) * 0.00001;
      currentLon = homeLon + (Math.random() - 0.5) * 0.00001;
      currentYaw = 0 + (Math.random() - 0.5) * 5;
    }
    // Phase 2: Cruise flight (15 seconds to landing start)
    else if (tSeconds < landingStart) {
      const cruiseTime = tSeconds - cruiseStart;
      const cruiseProgress = cruiseTime / (landingStart - cruiseStart);
      
      // Maintain altitude between 80-100m AGL with slight variations
      const baseAltitude = targetAltitudeMin + (targetAltitudeMax - targetAltitudeMin) * 0.5;
      currentHeightAgl = baseAltitude + Math.sin(cruiseTime * 0.1) * 5 + (Math.random() - 0.5) * 3;
      currentHeightAgl = Math.max(targetAltitudeMin, Math.min(targetAltitudeMax, currentHeightAgl));
      currentAltAsl = homeAltAsl + currentHeightAgl;
      
      // Create a circular/patrol pattern around the location
      const radiusKm = 0.5 + cruiseProgress * 0.3; // Expand radius over time (0.5-0.8 km)
      const angle = cruiseTime * 0.05; // Slow rotation
      
      // Calculate position based on target speed
      const prevSample = samples[samples.length - 1];
      const timeDiff = sampleRateMs / 1000; // seconds
      const distanceToTravel = targetSpeed * timeDiff; // meters per sample
      
      // Convert km to degrees (approximate: 1 degree lat ≈ 111 km)
      const radiusDeg = radiusKm / 111.0;
      const targetLat = homeLat + radiusDeg * Math.cos(angle);
      const targetLon = homeLon + radiusDeg * Math.sin(angle) / Math.cos(homeLat * Math.PI / 180);
      
      if (prevSample) {
        // Calculate direction to target
        const latDiffDeg = targetLat - prevSample.lat;
        const lonDiffDeg = targetLon - prevSample.lon;
        const distDeg = Math.sqrt(latDiffDeg * latDiffDeg + lonDiffDeg * lonDiffDeg);
        
        if (distDeg > 0) {
          // Move towards target at target speed
          const moveRatio = (distanceToTravel / 111000) / distDeg; // Convert meters to degrees
          currentLat = prevSample.lat + latDiffDeg * Math.min(moveRatio, 1);
          currentLon = prevSample.lon + lonDiffDeg * Math.min(moveRatio, 1);
        } else {
          currentLat = targetLat;
          currentLon = targetLon;
        }
      } else {
        currentLat = targetLat;
        currentLon = targetLon;
      }
      
      // Add small random variation
      currentLat += (Math.random() - 0.5) * 0.00005;
      currentLon += (Math.random() - 0.5) * 0.00005;
      
      // Yaw follows direction of travel
      if (samples.length > 0) {
        const prevLat = samples[samples.length - 1].lat;
        const prevLon = samples[samples.length - 1].lon;
        const latDiff = currentLat - prevLat;
        const lonDiff = currentLon - prevLon;
        currentYaw = (Math.atan2(lonDiff, latDiff) * 180 / Math.PI + 360) % 360;
      }
    }
    // Phase 3: Landing (last 30 seconds)
    else {
      const landingProgress = (tSeconds - landingStart) / (durationSeconds - landingStart);
      currentHeightAgl = targetAltitudeMin * (1 - landingProgress) + 0.1;
      currentAltAsl = homeAltAsl + currentHeightAgl;
      // Return to home point
      const returnProgress = landingProgress;
      currentLat = homeLat + (currentLat - homeLat) * (1 - returnProgress);
      currentLon = homeLon + (currentLon - homeLon) * (1 - returnProgress);
      currentYaw = 0;
    }
    
    // Calculate velocities - ensure realistic speeds
    let vx = 0, vy = 0, vz = 0, hSpeed = 0;
    if (samples.length > 0) {
      const prev = samples[samples.length - 1];
      const timeDiff = sampleRateMs / 1000; // seconds
      
      // Calculate distance differences in meters
      const latDiffM = (currentLat - prev.lat) * 111000; // meters (1 degree lat ≈ 111 km)
      const lonDiffM = (currentLon - prev.lon) * 111000 * Math.cos(homeLat * Math.PI / 180); // meters
      const altDiffM = currentHeightAgl - prev.height_agl_m; // meters
      
      // Calculate velocities in m/s
      vx = lonDiffM / timeDiff; // m/s (east)
      vy = latDiffM / timeDiff; // m/s (north)
      vz = -altDiffM / timeDiff; // m/s (down is negative)
      hSpeed = Math.sqrt(vx * vx + vy * vy);
      
      // Ensure realistic speed during cruise phase
      if (tSeconds >= cruiseStart && tSeconds < landingStart) {
        // During cruise, maintain target speed with variation
        if (hSpeed < 5.0) {
          // If calculated speed is too low, use target speed with direction
          const direction = Math.atan2(vy || 0, vx || 0);
          hSpeed = targetSpeed * (0.85 + Math.random() * 0.3); // 8.5-11.5 m/s
          vx = hSpeed * Math.cos(direction);
          vy = hSpeed * Math.sin(direction);
        }
      } else if (tSeconds < takeoffDuration) {
        // During takeoff, minimal horizontal movement
        hSpeed = Math.min(hSpeed, 2.0);
      } else if (tSeconds >= landingStart) {
        // During landing, slow down
        hSpeed = Math.min(hSpeed, 5.0);
      }
    } else {
      // First sample - no movement yet
      hSpeed = 0;
    }
    
    // Battery drain (realistic for Mavic 3 Enterprise)
    if (tSeconds > 0) {
      battery = Math.max(20, 100 - (tSeconds / 60) * 1.2); // ~1.2% per minute
      batteryVoltage = 17.6 - ((100 - battery) / 100) * 1.5; // Voltage drops as battery depletes
    }
    
    // Generate realistic attitude (pitch, roll, yaw)
    const pitch = Math.sin(tSeconds * 0.2) * 5 + (Math.random() - 0.5) * 2; // -7 to +7 degrees
    const roll = Math.cos(tSeconds * 0.15) * 3 + (Math.random() - 0.5) * 1.5; // -4.5 to +4.5 degrees
    
    // GPS quality (excellent in Thailand)
    const gpsLevel = 4 + Math.floor(Math.random() * 2); // 4-5
    const gpsSats = 18 + Math.floor(Math.random() * 5); // 18-22
    
    // RC inputs (simulated)
    const rcThrottle = Math.max(20, Math.min(80, 50 + pitch * 2));
    const rcAileron = roll * 10;
    const rcElevator = pitch * 10;
    const rcRudder = (currentYaw - (samples.length > 0 ? samples[samples.length - 1].yaw_deg : 0)) * 2;
    
    samples.push({
      t_ms: tMs,
      lat: parseFloat(currentLat.toFixed(7)),
      lon: parseFloat(currentLon.toFixed(7)),
      height_agl_m: parseFloat(currentHeightAgl.toFixed(2)),
      alt_asl_m: parseFloat(currentAltAsl.toFixed(2)),
      pitch_deg: parseFloat(pitch.toFixed(3)),
      roll_deg: parseFloat(roll.toFixed(3)),
      yaw_deg: parseFloat(currentYaw.toFixed(3)),
      vx_ms: parseFloat(vx.toFixed(3)),
      vy_ms: parseFloat(vy.toFixed(3)),
      vz_ms: parseFloat(vz.toFixed(3)),
      h_speed_ms: parseFloat(hSpeed.toFixed(3)),
      gps_level: gpsLevel,
      gps_sats: gpsSats,
      flight_mode: 'P-GPS',
      rc_aileron_pct: parseFloat(rcAileron.toFixed(1)),
      rc_elevator_pct: parseFloat(rcElevator.toFixed(1)),
      rc_throttle_pct: parseFloat(rcThrottle.toFixed(1)),
      rc_rudder_pct: parseFloat(rcRudder.toFixed(1)),
      battery_pct: Math.floor(battery),
      battery_voltage_v: parseFloat(batteryVoltage.toFixed(2)),
      warnings: battery < 30 ? ['LOW_BATTERY'] : [],
      event_flags: {
        photo_taken: Math.random() > 0.95, // Occasional photos
        video_rec: true,
        rth_active: tSeconds >= landingStart,
        obstacle_avoidance: true
      }
    });
  }
  
  return {
    flight_id: flightId,
    drone_id: droneId,
    drone_model: 'DJI Mavic 3',
    started_at_utc: startedAt.toISOString(),
    firmware_version: '01.01.1200',
    app_name: 'DJI Pilot 2',
    app_version: '2.0.8',
    home_point: {
      lat: homeLat,
      lon: homeLon,
      alt_asl_m: homeAltAsl
    },
    samples_hz: 2,
    samples: samples
  };
}

// Import flight logs
async function importFlights() {
  console.log('🚁 Importing Realistic Mavic 3 Enterprise Flight Logs');
  console.log('=====================================================\n');
  
  const locations = Object.keys(LOCATIONS);
  
  for (let i = 0; i < locations.length; i++) {
    const locationName = locations[i];
    const location = LOCATIONS[locationName];
    
    console.log(`📍 Generating flight for: ${locationName}`);
    console.log(`   Location: ${location.lat}°N, ${location.lon}°E`);
    console.log(`   Elevation: ${location.alt_asl}m ASL\n`);
    
    const flightLog = generateMavic3EnterpriseFlight(locationName, location, i + 1);
    
    console.log(`   Flight ID: ${flightLog.flight_id}`);
    console.log(`   Samples: ${flightLog.samples.length}`);
    console.log(`   Duration: ~${Math.floor(flightLog.samples.length * 0.5 / 60)} minutes`);
    console.log(`   Started: ${flightLog.started_at_utc}\n`);
    
    try {
      const response = await axios.post(API_URL, flightLog, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout for large payloads
      });
      
      console.log(`   ✅ Successfully imported!`);
      console.log(`   Log Hash: ${response.data.log_hash}`);
      console.log(`   Status: ${response.data.tokenization_status}\n`);
    } catch (error) {
      console.error(`   ❌ Failed to import flight:`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        if (error.response.data?.message) {
          console.error(`   Message: ${error.response.data.message}`);
        }
      } else if (error.request) {
        console.error(`   Network Error: No response from server`);
        console.error(`   URL: ${API_URL}`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
      console.error('');
    }
    
    // Wait between imports to avoid overwhelming the server
    if (i < locations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('✅ All flights imported!');
}

// Run import
importFlights().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

