const express = require("express");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const MaintenanceLog = require("../models/MaintenanceLog");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// @route   GET /api/analytics
// @desc    Operational analytics & financial overview
router.get("/", async (req, res) => {
  try {
    // ── Fleet utilization ──
    const totalVehicles = await Vehicle.countDocuments();
    const onTrip = await Vehicle.countDocuments({ status: "On Trip" });
    const inShop = await Vehicle.countDocuments({ status: "In Shop" });
    const available = await Vehicle.countDocuments({ status: "Available" });
    const retired = await Vehicle.countDocuments({ status: "Retired" });

    // ── Trip stats ──
    const totalTrips = await Trip.countDocuments();
    const delivered = await Trip.countDocuments({ status: "Delivered" });
    const cancelled = await Trip.countDocuments({ status: "Cancelled" });

    // ── Financial: fuel + misc expenses aggregated ──
    const expenseAgg = await Expense.aggregate([
      {
        $group: {
          _id: null,
          totalFuel: { $sum: "$fuelCost" },
          totalMisc: { $sum: "$miscExpense" },
          totalDistance: { $sum: "$distance" },
          count: { $sum: 1 },
        },
      },
    ]);

    const expenseTotals = expenseAgg[0] || {
      totalFuel: 0,
      totalMisc: 0,
      totalDistance: 0,
      count: 0,
    };

    // ── Maintenance cost aggregate ──
    const maintAgg = await MaintenanceLog.aggregate([
      { $group: { _id: null, totalCost: { $sum: "$cost" }, count: { $sum: 1 } } },
    ]);
    const maintTotals = maintAgg[0] || { totalCost: 0, count: 0 };

    // ── Per-vehicle cost breakdown (top 10 most expensive) ──
    const perVehicleExpense = await Expense.aggregate([
      {
        $lookup: {
          from: "trips",
          localField: "trip",
          foreignField: "_id",
          as: "tripData",
        },
      },
      { $unwind: "$tripData" },
      {
        $group: {
          _id: "$tripData.vehicle",
          fuelCost: { $sum: "$fuelCost" },
          miscCost: { $sum: "$miscExpense" },
          distance: { $sum: "$distance" },
          trips: { $sum: 1 },
        },
      },
      { $sort: { fuelCost: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "vehicles",
          localField: "_id",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      { $unwind: "$vehicle" },
      {
        $project: {
          licensePlate: "$vehicle.licensePlate",
          model: "$vehicle.model",
          fuelCost: 1,
          miscCost: 1,
          distance: 1,
          trips: 1,
          totalCost: { $add: ["$fuelCost", "$miscCost"] },
          fuelEfficiency: {
            $cond: [
              { $gt: ["$fuelCost", 0] },
              { $round: [{ $divide: ["$distance", "$fuelCost"] }, 2] },
              0,
            ],
          },
        },
      },
    ]);

    // ── Dead stock: vehicles with 0 trips in last 30 days ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeVehicleIds = await Trip.distinct("vehicle", {
      createdAt: { $gte: thirtyDaysAgo },
    });

    const deadStock = await Vehicle.find({
      _id: { $nin: activeVehicleIds },
      status: { $ne: "Retired" },
    }).select("licensePlate model type status odometer");

    // ── Fleet ROI: revenue proxy = delivered trips count × avg fuel cost ──
    const avgFuel =
      expenseTotals.count > 0
        ? expenseTotals.totalFuel / expenseTotals.count
        : 0;

    const totalExpenses =
      expenseTotals.totalFuel + expenseTotals.totalMisc + maintTotals.totalCost;

    res.json({
      fleet: {
        total: totalVehicles,
        onTrip,
        inShop,
        available,
        retired,
        utilization: totalVehicles > 0 ? Math.round((onTrip / totalVehicles) * 100) : 0,
      },
      trips: {
        total: totalTrips,
        delivered,
        cancelled,
        completionRate: totalTrips > 0 ? Math.round((delivered / totalTrips) * 100) : 0,
      },
      financials: {
        totalFuel: expenseTotals.totalFuel,
        totalMisc: expenseTotals.totalMisc,
        totalMaintenance: maintTotals.totalCost,
        totalExpenses,
        totalDistance: expenseTotals.totalDistance,
        avgFuelPerTrip: Math.round(avgFuel),
      },
      perVehicleCosts: perVehicleExpense,
      deadStock,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
