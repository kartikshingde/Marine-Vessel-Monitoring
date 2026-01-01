import mongoose from 'mongoose';

const sensorReadingSchema = new mongoose.Schema(
  {
    vesselId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vessel',
      required: true,
    },
    sensorType: {
      type: String,
      enum: ['speed', 'engine_temp', 'fuel_level', 'rpm', 'heading', 'gps'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    position: {
      latitude: Number,
      longitude: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
sensorReadingSchema.index({ vesselId: 1, sensorType: 1, timestamp: -1 });

export default mongoose.model('SensorReading', sensorReadingSchema);
