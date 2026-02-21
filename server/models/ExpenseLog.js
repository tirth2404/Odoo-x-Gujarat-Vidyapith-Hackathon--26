const mongoose = require("mongoose");

const expenseLogSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle is required"],
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
    },
    category: {
      type: String,
      enum: ["Toll", "Parking", "Repair", "Other"],
      default: "Other",
    },
    amount: {
      type: Number,
      required: [true, "Expense amount is required"],
      min: 0,
    },
    date: {
      type: Date,
      required: [true, "Expense date is required"],
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExpenseLog", expenseLogSchema);
