import mqtt from 'mqtt';
import dotenv from 'dotenv';

dotenv.config();

let mqttClient = null;

export function initializeMQTT(onMessage) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const sensorTopic = process.env.MQTT_TOPIC_SENSOR || 'water/quality/+';

  mqttClient = mqtt.connect(brokerUrl, {
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
  });

  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker:', brokerUrl);
    mqttClient.subscribe(sensorTopic, (err) => {
      if (err) {
        console.error('Failed to subscribe to sensor topic:', err);
      } else {
        console.log('Subscribed to sensor topic:', sensorTopic);
      }
    });
  });

  mqttClient.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      onMessage(topic, data);
    } catch (error) {
      console.error('Failed to parse MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT error:', error);
  });

  mqttClient.on('close', () => {
    console.log('MQTT connection closed');
  });

  return mqttClient;
}

export function publishControlCommand(sensorId, command) {
  if (!mqttClient || !mqttClient.connected) {
    throw new Error('MQTT client not connected');
  }

  const controlTopic = `water/control/${sensorId}`;
  const payload = JSON.stringify(command);
  
  mqttClient.publish(controlTopic, payload, { qos: 1 }, (error) => {
    if (error) {
      console.error('Failed to publish control command:', error);
      throw error;
    } else {
      console.log(`Published control command to ${controlTopic}:`, command);
    }
  });
}

export function getMQTTClient() {
  return mqttClient;
}

