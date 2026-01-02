import amqp from "amqplib";
import Vessel from "../models/Vessel.js";
import SensorReading from "../models/SensorReading.js";

let channel = null;
const QUEUE_NAME = "vessel-sensors";

/**
 * 🔌 CONNECT TO RABBITMQ (ONCE)
 */
export const connectRabbitMQ = async () => {
  if (channel) return channel;

  console.log("🐰 Connecting to RabbitMQ...");
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.prefetch(1); // 🔥 CRITICAL

  console.log("✅ Connected to RabbitMQ");
  return channel;
};

/**
 * 📥 START SENSOR CONSUMER
 */
export const startSensorConsumer = async (io) => {
  const ch = await connectRabbitMQ();

  console.log(`👂 Listening to queue: ${QUEUE_NAME}`);

  ch.consume(QUEUE_NAME, async (msg) => {
    if (!msg) return;

    try {
      const sensorData = JSON.parse(msg.content.toString());

      const vessel = await Vessel.findById(sensorData.vesselId);
      if (!vessel) {
        ch.ack(msg);
        return;
      }

      // Update vessel position
      vessel.currentPosition = {
        latitude: sensorData.position.latitude,
        longitude: sensorData.position.longitude,
        timestamp: new Date(),
      };
      vessel.speed = sensorData.speed;
      vessel.heading = sensorData.heading;

      vessel.positionHistory.push({
        latitude: sensorData.position.latitude,
        longitude: sensorData.position.longitude,
        timestamp: new Date(),
        speed: sensorData.speed,
      });

      vessel.positionHistory = vessel.positionHistory.slice(-50);
      await vessel.save();

      // Save sensor readings
      const readings = [];

      if (sensorData.engineTemp !== undefined)
        readings.push({
          vesselId: sensorData.vesselId,
          sensorType: "engine_temp",
          value: sensorData.engineTemp,
          unit: "°C",
        });

      if (sensorData.fuelLevel !== undefined)
        readings.push({
          vesselId: sensorData.vesselId,
          sensorType: "fuel_level",
          value: sensorData.fuelLevel,
          unit: "%",
        });

      if (sensorData.rpm !== undefined)
        readings.push({
          vesselId: sensorData.vesselId,
          sensorType: "rpm",
          value: sensorData.rpm,
          unit: "RPM",
        });

      if (readings.length) {
        await SensorReading.insertMany(readings);
      }

      // Emit updates (non-blocking)
      io.emit("vessel-position-update", {
        vesselId: vessel._id,
        position: vessel.currentPosition,
        speed: vessel.speed,
        heading: vessel.heading,
        timestamp: new Date(),
      });

      io.emit("sensor-update", {
        vesselId: vessel._id,
        sensors: {
          engineTemp: sensorData.engineTemp,
          fuelLevel: sensorData.fuelLevel,
          rpm: sensorData.rpm,
          speed: sensorData.speed,
          heading: sensorData.heading,
        },
        timestamp: new Date(),
      });

      ch.ack(msg);
    } catch (err) {
      console.error("❌ Sensor processing failed:", err.message);
      ch.nack(msg, false, false);
    }
  });
};
