const mongoose = require("mongoose");

const maintenanceLogSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle is required"],
    },
    issue: {
      type: String,
      required: [true, "Issue / service description is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Service date is required"],
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["New", "In Progress", "Completed"],
      default: "New",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaintenanceLog", maintenanceLogSchema);
