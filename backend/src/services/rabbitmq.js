import amqp from "amqplib";
import Vessel from "../models/Vessel.js";
import SensorReading from "../models/SensorReading.js";

let channel = null;
const QUEUE_NAME = "vessel-sensors";

export const connectRabbitMQ = async () => {
  if (channel) return channel;
  console.log("🐰 Connecting to RabbitMQ...");
  const connection = await amqp.connect("amqp://localhost");
  channel = await connection.createChannel();
  await channel.assertQueue(QUEUE_NAME, { durable: true });
  await channel.prefetch(1);
  console.log("✅ Connected to RabbitMQ");
  return channel;
};

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

      // ✅ SECURE BROADCASTING - ROOM-BASED
      const vesselRoom = 'role:captain';
      const managerRoom = 'role:manager';

      const positionUpdate = {
        vesselId: vessel._id,
        position: vessel.currentPosition,
        speed: vessel.speed,
        heading: vessel.heading,
        timestamp: new Date(),
      };

      const sensorUpdate = {
        vesselId: vessel._id,
        sensors: {
          engineTemp: sensorData.engineTemp || 0,
          fuelLevel: sensorData.fuelLevel || 0,
          rpm: sensorData.rpm || 0,
          speed: sensorData.speed || 0,
          heading: sensorData.heading || 0,
        },
        timestamp: new Date(),
      };

      // ✅ Send to MANAGERS (all vessels)
      io.to(managerRoom).emit("vessel-position-update", positionUpdate);
      io.to(managerRoom).emit("sensor-update", sensorUpdate);

      // ✅ Send ONLY to captain of THIS vessel
      io.to(vesselRoom).emit("vessel-position-update", positionUpdate);
      io.to(vesselRoom).emit("sensor-update", sensorUpdate);

      console.log(`✅ Sensor broadcast: ${vessel.name} → managers + captain`);

      ch.ack(msg);
    } catch (err) {
      console.error("❌ Sensor processing failed:", err.message);
      ch.nack(msg, false, false);
    }
  });
};
