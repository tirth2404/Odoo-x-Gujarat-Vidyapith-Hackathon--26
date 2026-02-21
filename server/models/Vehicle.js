const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    licensePlate: {
      type: String,
      required: [true, "License plate is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    model: {
      type: String,
      required: [true, "Model/Year is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Truck", "Van", "Mini", "Bike", "Trailer"],
      required: [true, "Vehicle type is required"],
    },
    maxCapacity: {
      type: Number,
      required: [true, "Max load capacity is required"],
      min: 0,
    },
    capacityUnit: {
      type: String,
      enum: ["kg", "ton"],
      default: "ton",
    },
    odometer: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Available", "On Trip", "In Shop", "Retired"],
      default: "Available",
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
