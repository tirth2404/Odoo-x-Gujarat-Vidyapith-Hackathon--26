const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: [true, "Trip is required"],
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Driver is required"],
    },
    distance: {
      type: Number,
      default: 0,
      min: 0,
    },
    fuelCost: {
      type: Number,
      required: [true, "Fuel cost is required"],
      min: 0,
    },
    miscExpense: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Done"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
