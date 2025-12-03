import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function waitForDatabase(maxRetries = 30, delayMs = 2000) {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'iot_web3',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('Database is ready');
      return true;
    } catch (error) {
      console.log(`Waiting for database... (attempt ${i + 1}/${maxRetries})`);
      await client.end().catch(() => {});
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}

async function migrate() {
  // Wait for database to be ready
  const dbReady = await waitForDatabase();
  if (!dbReady) {
    console.error('Database is not ready after maximum retries');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'iot_web3',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Database schema created successfully');

    await client.end();
  } catch (error) {
    console.error('Migration failed:', error);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

migrate();

