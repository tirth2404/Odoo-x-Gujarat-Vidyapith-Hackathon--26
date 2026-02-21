const mongoose = require("mongoose");

const driverProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      trim: true,
    },
    licenseExpiry: {
      type: Date,
      required: [true, "License expiry date is required"],
    },
    safetyScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    complaints: {
      type: Number,
      default: 0,
      min: 0,
    },
    dutyStatus: {
      type: String,
      enum: ["On Duty", "Off Duty", "On Break", "Suspended"],
      default: "On Duty",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DriverProfile", driverProfileSchema);
