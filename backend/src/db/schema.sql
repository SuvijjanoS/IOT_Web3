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

-- Device Registry Table
-- Stores IoT device identities and their associated wallet addresses
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id BYTEA NOT NULL UNIQUE,  -- bytes32 deviceId (keccak256 hash)
  device_wallet TEXT NOT NULL,      -- Ethereum address
  device_privkey_encrypted TEXT,    -- Encrypted private key (for prototype, custodial)
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  hardware_nonce TEXT,
  fingerprint BYTEA,                -- bytes32 fingerprint
  is_active BOOLEAN DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log Tokens Table
-- Tracks ERC-721 tokens minted for log hashes
CREATE TABLE IF NOT EXISTS log_tokens (
  id SERIAL PRIMARY KEY,
  token_id BIGINT NOT NULL UNIQUE,
  device_id BYTEA NOT NULL,          -- bytes32 deviceId
  log_hash BYTEA NOT NULL,           -- SHA256 hash of canonicalized log
  log_type TEXT NOT NULL,            -- 'DEVICE_LOG' or 'COMMAND_LOG'
  logged_at BIGINT NOT NULL,          -- uint64 timestamp
  uri TEXT,                           -- Optional IPFS/S3 pointer
  owner_address TEXT NOT NULL,        -- Token owner (device wallet or command center)
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Command Center Logs Table
-- Stores command/instruction logs that are tokenized
CREATE TABLE IF NOT EXISTS command_logs (
  id SERIAL PRIMARY KEY,
  command_id TEXT NOT NULL UNIQUE,
  device_id BYTEA,                   -- Target device (or NULL for broadcast)
  command_type TEXT NOT NULL,         -- e.g., 'UPDATE_FIRMWARE', 'CHANGE_CONFIG', etc.
  command_params JSONB NOT NULL,     -- Command parameters
  result JSONB,                      -- Command execution result
  log_hash BYTEA NOT NULL,           -- SHA256 hash of canonicalized command log
  token_id BIGINT REFERENCES log_tokens(token_id),
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Logs Table (generic)
-- Stores device telemetry logs that are tokenized
CREATE TABLE IF NOT EXISTS device_logs (
  id SERIAL PRIMARY KEY,
  log_id TEXT NOT NULL UNIQUE,
  device_id BYTEA NOT NULL REFERENCES devices(device_id),
  log_data JSONB NOT NULL,           -- The actual log entries (JSONL format)
  log_hash BYTEA NOT NULL,           -- SHA256 hash of canonicalized log
  token_id BIGINT REFERENCES log_tokens(token_id),
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_wallet ON devices(device_wallet);
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices(is_active);
CREATE INDEX IF NOT EXISTS idx_log_tokens_token_id ON log_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_log_tokens_log_hash ON log_tokens(log_hash);
CREATE INDEX IF NOT EXISTS idx_log_tokens_device_id ON log_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_log_tokens_owner ON log_tokens(owner_address);
CREATE INDEX IF NOT EXISTS idx_command_logs_command_id ON command_logs(command_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_device_id ON command_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_command_logs_log_hash ON command_logs(log_hash);
CREATE INDEX IF NOT EXISTS idx_device_logs_log_id ON device_logs(log_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_device_id ON device_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_log_hash ON device_logs(log_hash);

-- Sensor Datapoints Table
-- Stores individual parameter measurements with separate tokenization
CREATE TABLE IF NOT EXISTS sensor_datapoints (
  id SERIAL PRIMARY KEY,
  reading_id INTEGER REFERENCES water_readings(id) ON DELETE CASCADE,
  sensor_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  parameter_name TEXT NOT NULL,        -- 'ph', 'temperature_c', 'turbidity_ntu', 'tds_mg_l', 'dissolved_oxygen_mg_l'
  parameter_value NUMERIC NOT NULL,
  datapoint_hash BYTEA NOT NULL,       -- hash(sensor_id + timestamp + parameter_name + parameter_value)
  token_id BIGINT REFERENCES log_tokens(token_id),
  tx_hash TEXT,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sensor_datapoints
CREATE INDEX IF NOT EXISTS idx_sensor_datapoints_sensor_id ON sensor_datapoints(sensor_id);
CREATE INDEX IF NOT EXISTS idx_sensor_datapoints_ts ON sensor_datapoints(ts);
CREATE INDEX IF NOT EXISTS idx_sensor_datapoints_parameter ON sensor_datapoints(sensor_id, parameter_name, ts);
CREATE INDEX IF NOT EXISTS idx_sensor_datapoints_hash ON sensor_datapoints(datapoint_hash);
CREATE INDEX IF NOT EXISTS idx_sensor_datapoints_reading_id ON sensor_datapoints(reading_id);

