import mongoose from 'mongoose';

const vesselSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vessel name is required'],
      trim: true,
    },
    mmsi: {
      type: String,
      unique: true,
      required: [true, 'MMSI is required'],
    },
    type: {
      type: String,
      enum: ['cargo', 'tanker', 'passenger', 'fishing', 'military'],
      default: 'cargo',
    },
    currentPosition: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    speed: {
      type: Number,
      default: 0,
      min: 0,
    },
    heading: {
      type: Number,
      default: 0,
      min: 0,
      max: 360,
    },
    status: {
      type: String,
      enum: ['active', 'docked', 'anchored', 'maintenance'],
      default: 'active',
    },
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    positionHistory: [
      {
        latitude: Number,
        longitude: Number,
        timestamp: Date,
        speed: Number,
      },
    ],
  },
  { timestamps: true }
);

// Index for fast queries
vesselSchema.index({ mmsi: 1 });
vesselSchema.index({ status: 1 });

export default mongoose.model('Vessel', vesselSchema);
