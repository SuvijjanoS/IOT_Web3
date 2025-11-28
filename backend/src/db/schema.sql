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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_water_readings_sensor_id ON water_readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_water_readings_ts ON water_readings(ts);
CREATE INDEX IF NOT EXISTS idx_water_readings_data_hash ON water_readings(data_hash);
CREATE INDEX IF NOT EXISTS idx_control_commands_sensor_id ON control_commands(sensor_id);
CREATE INDEX IF NOT EXISTS idx_control_commands_created_at ON control_commands(created_at);

