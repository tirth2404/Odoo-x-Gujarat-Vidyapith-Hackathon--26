const express = require("express");
const FuelLog = require("../models/FuelLog");
const ExpenseLog = require("../models/ExpenseLog");
const MaintenanceLog = require("../models/MaintenanceLog");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

const readRoles = ["fleet_manager", "financial_analyst"];
const writeRoles = ["fleet_manager", "financial_analyst"];

router.get("/fuel", authorize(...readRoles), async (req, res) => {
  try {
    const { vehicle, trip } = req.query;
    const filter = {};

    if (vehicle) filter.vehicle = vehicle;
    if (trip) filter.trip = trip;

    const fuelLogs = await FuelLog.find(filter)
      .populate("vehicle", "licensePlate model")
      .populate("trip", "origin destination status")
      .sort({ date: -1, createdAt: -1 });

    res.json(fuelLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/fuel", authorize(...writeRoles), async (req, res) => {
  try {
    const { vehicle: vehicleId, trip: tripId, liters, cost, date, note } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (tripId) {
      const trip = await Trip.findById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.status !== "Delivered") {
        return res.status(400).json({ message: "Fuel can be logged only for delivered trips" });
      }
      if (String(trip.vehicle) !== String(vehicleId)) {
        return res.status(400).json({ message: "Selected trip does not belong to selected vehicle" });
      }
    }

    const log = await FuelLog.create({
      vehicle: vehicleId,
      trip: tripId || null,
      liters,
      cost,
      date,
      note,
      createdBy: req.user._id,
    });

    const populated = await FuelLog.findById(log._id)
      .populate("vehicle", "licensePlate model")
      .populate("trip", "origin destination status");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/other", authorize(...readRoles), async (req, res) => {
  try {
    const { vehicle, trip } = req.query;
    const filter = {};

    if (vehicle) filter.vehicle = vehicle;
    if (trip) filter.trip = trip;

    const expenseLogs = await ExpenseLog.find(filter)
      .populate("vehicle", "licensePlate model")
      .populate("trip", "origin destination status")
      .sort({ date: -1, createdAt: -1 });

    res.json(expenseLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/other", authorize(...writeRoles), async (req, res) => {
  try {
    const { vehicle: vehicleId, trip: tripId, category, amount, date, note } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (tripId) {
      const trip = await Trip.findById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (String(trip.vehicle) !== String(vehicleId)) {
        return res.status(400).json({ message: "Selected trip does not belong to selected vehicle" });
      }
    }

    const log = await ExpenseLog.create({
      vehicle: vehicleId,
      trip: tripId || null,
      category,
      amount,
      date,
      note,
      createdBy: req.user._id,
    });

    const populated = await ExpenseLog.findById(log._id)
      .populate("vehicle", "licensePlate model")
      .populate("trip", "origin destination status");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/summary", authorize(...readRoles), async (req, res) => {
  try {
    const [fuelAgg, maintenanceAgg, otherAgg, vehicles] = await Promise.all([
      FuelLog.aggregate([
        { $group: { _id: "$vehicle", totalFuelCost: { $sum: "$cost" }, totalFuelLiters: { $sum: "$liters" } } },
      ]),
      MaintenanceLog.aggregate([
        { $group: { _id: "$vehicle", totalMaintenanceCost: { $sum: "$cost" } } },
      ]),
      ExpenseLog.aggregate([
        { $group: { _id: "$vehicle", totalOtherExpense: { $sum: "$amount" } } },
      ]),
      Vehicle.find().select("_id licensePlate model"),
    ]);

    const fuelMap = new Map(fuelAgg.map((row) => [String(row._id), row]));
    const maintenanceMap = new Map(maintenanceAgg.map((row) => [String(row._id), row]));
    const otherMap = new Map(otherAgg.map((row) => [String(row._id), row]));

    const perVehicle = vehicles.map((vehicle) => {
      const vehicleId = String(vehicle._id);
      const fuel = fuelMap.get(vehicleId);
      const maintenance = maintenanceMap.get(vehicleId);
      const other = otherMap.get(vehicleId);

      const totalFuelCost = fuel?.totalFuelCost || 0;
      const totalFuelLiters = fuel?.totalFuelLiters || 0;
      const totalMaintenanceCost = maintenance?.totalMaintenanceCost || 0;
      const totalOtherExpense = other?.totalOtherExpense || 0;
      const totalOperationalCost = totalFuelCost + totalMaintenanceCost + totalOtherExpense;

      return {
        vehicleId,
        licensePlate: vehicle.licensePlate,
        model: vehicle.model,
        totalFuelCost,
        totalFuelLiters,
        totalMaintenanceCost,
        totalOtherExpense,
        totalOperationalCost,
      };
    });

    const totals = perVehicle.reduce(
      (acc, row) => {
        acc.totalFuelCost += row.totalFuelCost;
        acc.totalFuelLiters += row.totalFuelLiters;
        acc.totalMaintenanceCost += row.totalMaintenanceCost;
        acc.totalOtherExpense += row.totalOtherExpense;
        acc.totalOperationalCost += row.totalOperationalCost;
        return acc;
      },
      {
        totalFuelCost: 0,
        totalFuelLiters: 0,
        totalMaintenanceCost: 0,
        totalOtherExpense: 0,
        totalOperationalCost: 0,
      }
    );

    res.json({ totals, perVehicle });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
