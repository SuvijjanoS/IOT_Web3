import axios from 'axios';

const API_URL = process.env.API_URL || 'https://web3iot.dhammada.com/api';

async function cleanupSensors() {
  console.log('🧹 Cleaning up existing sensors and readings...\n');

  try {
    // Get all sensors
    const sensorsResponse = await axios.get(`${API_URL}/sensors`);
    const sensors = sensorsResponse.data || [];

    console.log(`Found ${sensors.length} sensors to clean up\n`);

    // Note: We'll delete readings via database, not API
    // The API doesn't have a delete endpoint, so we'll need to do it via direct DB access
    console.log('⚠️  Note: Sensor readings will be deleted via database cleanup script');
    console.log('   Run the database cleanup SQL manually or via psql\n');

    return sensors;
  } catch (error) {
    console.error('Error fetching sensors:', error.response?.data || error.message);
    return [];
  }
}

cleanupSensors().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

