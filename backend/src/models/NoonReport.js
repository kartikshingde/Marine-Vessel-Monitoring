import mongoose from "mongoose";

const NoonReportSchema = new mongoose.Schema(
  {
    vesselId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vessel",
      required: true,
    },
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reportedAt: {
      type: Date,
      default: Date.now,
    },

    position: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    averageSpeed: { type: Number }, // knots
    distanceSinceLastNoon: { type: Number }, // nm
    courseOverGround: { type: Number }, // degrees

    fuelRob: { type: Number }, // t or m3 (your choice)
    fuelConsumedSinceLastNoon: { type: Number },

    mainEngineRpm: { type: Number },
    mainEnginePower: { type: Number },

    weather: {
      windSpeed: Number, // kn or km/h (match your weather endpoint)
      windDirection: Number, // degrees
      seaState: String, // e.g. "Calm", "Moderate", "Rough"
      swell: String,
      visibility: String,
      remarks: String,
    },

    voyageNo: String,
    nextPort: String,
    eta: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("NoonReport", NoonReportSchema);
