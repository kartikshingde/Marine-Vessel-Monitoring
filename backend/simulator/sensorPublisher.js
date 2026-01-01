import amqp from 'amqplib';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vessel from '../src/models/Vessel.js';

dotenv.config();

const QUEUE_NAME = 'vessel-sensors';
let channel = null;

/**
 *  Connect to RabbitMQ
 */
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(' Connected to RabbitMQ');
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

/**
 *  Generate random sensor data
 */
function generateSensorData(vessel) {
  // Random movement (small changes for realistic simulation)
  const latChange = (Math.random() - 0.5) * 0.01; // ~1km
  const lonChange = (Math.random() - 0.5) * 0.01;

  const newLat = vessel.currentPosition.latitude + latChange;
  const newLon = vessel.currentPosition.longitude + lonChange;

  return {
    vesselId: vessel._id.toString(),
    position: {
      latitude: parseFloat(newLat.toFixed(6)),
      longitude: parseFloat(newLon.toFixed(6)),
    },
    speed: Math.max(0, vessel.speed + (Math.random() - 0.5) * 2), // ±1 knot
    heading: (vessel.heading + (Math.random() - 0.5) * 5) % 360, // ±2.5°
    engineTemp: 70 + Math.random() * 30, // 70-100°C
    fuelLevel: Math.max(20, 100 - Math.random() * 5), // Slowly decreases
    rpm: 1200 + Math.random() * 400, // 1200-1600 RPM
    timestamp: new Date().toISOString(),
  };
}

/**
 *  Simulate sensor data for all vessels
 */
async function simulateSensors() {
  try {
    // Get all active vessels
    const vessels = await Vessel.find({ status: 'active' });

    if (vessels.length === 0) {
      console.log('⚠️  No active vessels found');
      return;
    }

    console.log(`\n📡 Simulating sensors for ${vessels.length} vessels...`);

    for (const vessel of vessels) {
      const sensorData = generateSensorData(vessel);

      // Send to RabbitMQ queue
      channel.sendToQueue(
        QUEUE_NAME,
        Buffer.from(JSON.stringify(sensorData)),
        { persistent: true }
      );

      console.log(` ${vessel.name} - Lat: ${sensorData.position.latitude}, Speed: ${sensorData.speed.toFixed(1)}kn`);
    }
  } catch (error) {
    console.error('Error simulating sensors:', error);
  }
}

/**
 *  Main function
 */
async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' MongoDB Connected');

    // Connect to RabbitMQ
    await connectRabbitMQ();

    console.log('\n🚢 Vessel Sensor Simulator Started!');
    console.log('📡 Publishing sensor data every 10 seconds...\n');

    // Run simulation every 5 seconds
    setInterval(simulateSensors, 5);

    // Run first simulation immediately
    simulateSensors();
  } catch (error) {
    console.error(' Startup error:', error);
    process.exit(1);
  }
}

main();
