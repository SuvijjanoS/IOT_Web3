# Import Realistic Mavic 3 Enterprise Flight Logs

## Overview

This script generates and imports realistic flight logs for a DJI Mavic 3 Enterprise drone at 5 locations in Thailand:

1. **Bangkok Victory Monument** - 13.7649°N, 100.5383°E
2. **PTTEP Songkhla Base** - 7.2069°N, 100.5967°E
3. **Energy Complex Building, Bangkok** - 13.7200°N, 100.5300°E
4. **Hatyai City** - 7.0083°N, 100.4767°E
5. **Chiangrai City** - 19.9100°N, 99.8317°E

## Flight Specifications

Each flight log contains:
- **Duration**: 30 minutes
- **Sampling Rate**: 2 Hz (500ms intervals)
- **Total Samples**: ~3,600 per flight
- **Altitude**: 80-100 meters AGL
- **Speed**: ~10 m/s average
- **Flight Pattern**: Circular patrol pattern expanding over time
- **Battery**: Realistic drain (~1.2% per minute)

## Flight Phases

1. **Takeoff** (0-15 seconds): Vertical ascent to cruise altitude
2. **Cruise** (15 seconds to 30 seconds before end): Circular patrol pattern
3. **Landing** (last 30 seconds): Return to home point and descend

## Usage

### Local Testing

```bash
cd /Users/ss/IOT_Web3/drone-simulator
API_URL=http://localhost:3001/api/v1/drone-logs node import-realistic-drone-flights.js
```

### Production (on server)

```bash
cd /Users/ss/IOT_Web3
ssh root@152.42.239.238
cd /root/IOT_web3/drone-simulator
API_URL=https://web3iot.dhammada.com/api/v1/drone-logs node import-realistic-drone-flights.js
```

Or from local machine:

```bash
cd /Users/ss/IOT_Web3/drone-simulator
API_URL=https://web3iot.dhammada.com/api/v1/drone-logs node import-realistic-drone-flights.js
```

## Data Structure

Each flight log includes:

- **Flight Metadata**:
  - Flight ID (unique)
  - Drone ID: MAVIC3E_001
  - Model: DJI Mavic 3 Enterprise
  - Start time (randomized within past week)
  - Home point coordinates

- **Sample Data** (per sample):
  - Timestamp (t_ms)
  - GPS coordinates (lat, lon)
  - Altitude AGL and ASL
  - Attitude (pitch, roll, yaw)
  - Velocities (vx, vy, vz, h_speed)
  - GPS quality (level, satellites)
  - Flight mode
  - RC inputs
  - Battery status
  - Warnings and event flags

## Expected Output

```
🚁 Importing Realistic Mavic 3 Enterprise Flight Logs
=====================================================

📍 Generating flight for: Bangkok Victory Monument
   Location: 13.7649°N, 100.5383°E
   Elevation: 12m ASL

   Flight ID: MAVIC3E_FLIGHT_BANGKOK_VICTORY_MONUMENT_1_...
   Samples: 3600
   Duration: ~30 minutes
   Started: 2025-11-25T14:23:00.000Z

   ✅ Successfully imported!
   Log Hash: abc123...
   Status: PENDING

[... continues for all 5 locations ...]

✅ All flights imported!
```

## Verification

After importing, verify flights in the database:

```bash
# Check flights via API
curl https://web3iot.dhammada.com/api/drone-flights | jq '.[] | {flight_id, drone_id, started_at_utc, samples_count, duration_s}'
```

Or view in the dashboard:
- Navigate to: https://web3iot.dhammada.com/drones
- Select "MAVIC3E_001" to see all flights

## Notes

- Flights are generated with realistic variations in altitude, speed, and position
- Battery drain is simulated based on flight time
- GPS quality reflects typical conditions in Thailand (excellent)
- Flight patterns create circular patrol routes around each location
- All data follows the Mavic 3 Enterprise schema and specifications

