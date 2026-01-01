import amqp from "amqplib";
import Vessel from "../models/Vessel.js";
import SensorReading from "../models/SensorReading.js";

let channel = null;

/**
 * 🔌 CONNECT TO RABBITMQ
 */
export const connectRabbitMQ = async () => {
  try {
    console.log("🐰 Connecting to RabbitMQ...");
    const connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();
    console.log(" Connected to RabbitMQ");
    return channel;
  } catch (error) {
    console.error(" RabbitMQ connection failed:", error.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};

/**
 *  START CONSUMING SENSOR DATA
 */
export const startSensorConsumer = async (io) => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }

    const QUEUE_NAME = "vessel-sensors";

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
    });

    console.log(`👂 Listening to queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, async (message) => {
      if (message) {
        try {
          const sensorData = JSON.parse(message.content.toString());
          console.log("📡 Received sensor data:", sensorData.vesselId);

          const vessel = await Vessel.findById(sensorData.vesselId);

          if (vessel) {
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

            if (vessel.positionHistory.length > 50) {
              vessel.positionHistory = vessel.positionHistory.slice(-50);
            }

            await vessel.save();

            //  Save sensor readings
            const sensorPromises = [];

            sensorPromises.push(
              SensorReading.create({
                vesselId: sensorData.vesselId,
                sensorType: "gps",
                value: sensorData.speed,
                unit: "knots",
                position: sensorData.position,
                timestamp: new Date(),
              })
            );

            if (sensorData.engineTemp !== undefined) {
              sensorPromises.push(
                SensorReading.create({
                  vesselId: sensorData.vesselId,
                  sensorType: "engine_temp",
                  value: sensorData.engineTemp,
                  unit: "°C",
                  timestamp: new Date(),
                })
              );
            }

            if (sensorData.fuelLevel !== undefined) {
              sensorPromises.push(
                SensorReading.create({
                  vesselId: sensorData.vesselId,
                  sensorType: "fuel_level",
                  value: sensorData.fuelLevel,
                  unit: "%",
                  timestamp: new Date(),
                })
              );
            }

            if (sensorData.rpm !== undefined) {
              sensorPromises.push(
                SensorReading.create({
                  vesselId: sensorData.vesselId,
                  sensorType: "rpm",
                  value: sensorData.rpm,
                  unit: "RPM",
                  timestamp: new Date(),
                })
              );
            }

            if (sensorData.heading !== undefined) {
              sensorPromises.push(
                SensorReading.create({
                  vesselId: sensorData.vesselId,
                  sensorType: "heading",
                  value: sensorData.heading,
                  unit: "°",
                  timestamp: new Date(),
                })
              );
            }

            await Promise.all(sensorPromises);

            //  FIXED: Broadcast with heading included
            console.log("🔊 Broadcasting position update...");
            io.emit("vessel-position-update", {
              vesselId: sensorData.vesselId,
              position: vessel.currentPosition,
              speed: vessel.speed,
              heading: vessel.heading,
              timestamp: new Date(),
            });

            console.log("🔊 Broadcasting sensor update...");
            io.emit("sensor-update", {
              vesselId: sensorData.vesselId,
              sensors: {
                engineTemp: sensorData.engineTemp || 0,
                fuelLevel: sensorData.fuelLevel || 0,
                rpm: sensorData.rpm || 0,
                speed: sensorData.speed || 0,
                heading: sensorData.heading || 0, 
              },
              timestamp: new Date(),
            });

            console.log(` Updated vessel ${vessel.name} - Broadcasted to all clients`);
          }

          channel.ack(message);
        } catch (error) {
          console.error("Error processing message:", error);
          channel.nack(message, false, false);
        }
      }
    });
  } catch (error) {
    console.error("Failed to start consumer:", error);
  }
};

/**
 * 📤 SEND MESSAGE TO QUEUE
 */
export const publishSensorData = async (data) => {
  if (!channel) {
    await connectRabbitMQ();
  }

  const QUEUE_NAME = "vessel-sensors";
  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(data)), {
    persistent: true,
  });

  console.log("📤 Published sensor data to queue");
};
