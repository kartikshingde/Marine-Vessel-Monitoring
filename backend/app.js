import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.js";
import vesselRoutes from "./src/routes/vessels.js";
import userRoutes from "./src/routes/users.js";
import sensorRoutes from "./src/routes/sensors.js";
import User from "./src/models/User.js";
import { connectRabbitMQ, startSensorConsumer } from "./src/services/rabbitmq.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  allowEIO3: true,
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("io", io);

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/vessels", vesselRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sensors", sensorRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚢 Marine Vessel API is running",
    timestamp: new Date().toISOString(),
  });
});

// ✅ SOCKET.IO AUTHENTICATION MIDDLEWARE
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).populate('vesselId');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// ✅ SOCKET.IO CONNECTION WITH ROOMS
io.on("connection", (socket) => {
  const user = socket.user;
  console.log(`✅ ${user.role} connected: ${user.name}`);

  try {
    // Join role-based room
    socket.join(`role:${user.role}`);

    // Captains join their vessel room
    if (user.role === 'captain' && user.vesselId) {
      const vesselIdString = user.vesselId._id 
        ? user.vesselId._id.toString() 
        : user.vesselId.toString();
      
      socket.join(`vessel:${vesselIdString}`);
      console.log(`🚢 Captain ${user.name} joined vessel:${vesselIdString}`);
    }

    socket.on("disconnect", () => {
      console.log(`❌ ${user.role} disconnected: ${user.name}`);
    });

  } catch (error) {
    console.error(`Error in socket connection:`, error);
    socket.disconnect(true);
  }
});



app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong!",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.IO ready on ws://localhost:${PORT}`);

  try {
    await connectRabbitMQ();
    await startSensorConsumer(io);
    console.log("✅ RabbitMQ consumer started");
  } catch (err) {
    console.error("⚠️ RabbitMQ error:", err.message);
  }
});
