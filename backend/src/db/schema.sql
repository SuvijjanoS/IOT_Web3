-- Water Quality Readings Table
CREATE TABLE IF NOT EXISTS water_readings (
  id SERIAL PRIMARY KEY,
  sensor_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  ph NUMERIC,
  temperature_c NUMERIC,
  turbidity_ntu NUMERIC,
  tds_mg_l NUMERIC,
  dissolved_oxygen_mg_l NUMERIC,
  battery_pct INT,
  status TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  raw_json JSONB NOT NULL,
  data_hash BYTEA NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Control Commands Table
CREATE TABLE IF NOT EXISTS control_commands (
  id SERIAL PRIMARY KEY,
  sensor_id TEXT NOT NULL,
  relay_id TEXT NOT NULL,
  command TEXT NOT NULL,
  state TEXT NOT NULL,
  duration_sec INT,
  command_hash BYTEA NOT NULL,
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drone Flight Logs Table
CREATE TABLE IF NOT EXISTS drone_flights (
  id SERIAL PRIMARY KEY,
  flight_id TEXT NOT NULL UNIQUE,
  drone_id TEXT NOT NULL,
  drone_model TEXT NOT NULL,
  started_at_utc TIMESTAMPTZ NOT NULL,
  firmware_version TEXT,
  app_name TEXT,
  app_version TEXT,
  home_point_lat NUMERIC,
  home_point_lon NUMERIC,
  home_point_alt_asl_m NUMERIC,
  samples_hz INTEGER,
  samples_count INTEGER NOT NULL,
  duration_s NUMERIC,
  max_height_agl_m NUMERIC,
  max_alt_asl_m NUMERIC,
  max_h_speed_ms NUMERIC,
  log_hash BYTEA NOT NULL,
  raw_json JSONB NOT NULL,
  tokenization_status TEXT DEFAULT 'PENDING',
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drone Flight Samples Table (for detailed time-series data)
CREATE TABLE IF NOT EXISTS drone_flight_samples (
  id SERIAL PRIMARY KEY,
  flight_id TEXT NOT NULL REFERENCES drone_flights(flight_id) ON DELETE CASCADE,
  t_ms INTEGER NOT NULL,
  lat NUMERIC,
  lon NUMERIC,
  height_agl_m NUMERIC,
  alt_asl_m NUMERIC,
  pitch_deg NUMERIC,
  roll_deg NUMERIC,
  yaw_deg NUMERIC,
  vx_ms NUMERIC,
  vy_ms NUMERIC,
  vz_ms NUMERIC,
  h_speed_ms NUMERIC,
  gps_level INTEGER,
  gps_sats INTEGER,
  flight_mode TEXT,
  rc_aileron_pct NUMERIC,
  rc_elevator_pct NUMERIC,
  rc_throttle_pct NUMERIC,
  rc_rudder_pct NUMERIC,
  battery_pct INTEGER,
  battery_voltage_v NUMERIC,
  warnings JSONB,
  event_flags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_water_readings_sensor_id ON water_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_ts ON water_readings(ts);
CREATE INDEX IF NOT EXISTS idx_water_readings_data_hash ON water_readings(data_hash);
CREATE INDEX IF NOT EXISTS idx_control_commands_sensor_id ON control_commands(sensor_id);
CREATE INDEX IF NOT EXISTS idx_control_commands_created_at ON control_commands(created_at);
CREATE INDEX IF NOT EXISTS idx_drone_flights_drone_id ON drone_flights(drone_id);
CREATE INDEX IF NOT EXISTS idx_drone_flights_started_at ON drone_flights(started_at_utc);
CREATE INDEX IF NOT EXISTS idx_drone_flights_log_hash ON drone_flights(log_hash);
CREATE INDEX IF NOT EXISTS idx_drone_flights_flight_id ON drone_flights(flight_id);
CREATE INDEX IF NOT EXISTS idx_drone_flight_samples_flight_id ON drone_flight_samples(flight_id);
CREATE INDEX IF NOT EXISTS idx_drone_flight_samples_t_ms ON drone_flight_samples(flight_id, t_ms);

