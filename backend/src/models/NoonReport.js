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
    averageSpeed: { type: Number },
    distanceSinceLastNoon: { type: Number },
    courseOverGround: { type: Number },
    fuelRob: { type: Number },
    fuelConsumedSinceLastNoon: { type: Number },
    mainEngineRpm: { type: Number },
    mainEnginePower: { type: Number },
    //  FIXED: All weather fields are now STRINGS (not Numbers)
    weather: {
      windSpeed: String,      
      windDirection: String,  
      seaState: String,       
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
