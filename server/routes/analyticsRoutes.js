const express = require("express");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const MaintenanceLog = require("../models/MaintenanceLog");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// Helper: month labels
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// @route   GET /api/analytics
// @desc    Operational analytics & financial overview (with monthly charts data)
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

    // ── Monthly Fuel Efficiency Trend (km per ₹ of fuel, by month) ──
    const fuelTrendAgg = await Expense.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalDistance: { $sum: "$distance" },
          totalFuel: { $sum: "$fuelCost" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const fuelEfficiencyTrend = fuelTrendAgg.map((row) => ({
      label: `${MONTHS[row._id.month - 1]} ${row._id.year}`,
      efficiency: row.totalFuel > 0 ? parseFloat((row.totalDistance / row.totalFuel).toFixed(2)) : 0,
      distance: row.totalDistance,
      fuelCost: row.totalFuel,
    }));

    // ── Top 5 Costliest Vehicles (fuel + misc + maintenance) ──
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

    // Add maintenance costs per vehicle to the top-5 list
    const maintPerVehicle = await MaintenanceLog.aggregate([
      { $group: { _id: "$vehicle", maintCost: { $sum: "$cost" } } },
    ]);
    const maintMap = {};
    maintPerVehicle.forEach((m) => { maintMap[String(m._id)] = m.maintCost; });

    const costliest = perVehicleExpense.map((v) => ({
      ...v,
      maintCost: maintMap[String(v._id)] || 0,
      grandTotal: (v.fuelCost || 0) + (v.miscCost || 0) + (maintMap[String(v._id)] || 0),
    }));
    costliest.sort((a, b) => b.grandTotal - a.grandTotal);
    const top5Costliest = costliest.slice(0, 5);

    // ── Monthly Financial Summary (Revenue proxy = estimatedFuelCost from delivered trips) ──
    const monthlyTrips = await Trip.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: {
            $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, "$estimatedFuelCost", 0] },
          },
          tripCount: { $sum: 1 },
          deliveredCount: {
            $sum: { $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const monthlyExpenses = await Expense.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          fuelCost: { $sum: "$fuelCost" },
          miscCost: { $sum: "$miscExpense" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyMaint = await MaintenanceLog.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          maintCost: { $sum: "$cost" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Merge monthly data
    const monthlyMap = {};
    monthlyTrips.forEach((r) => {
      const key = `${r._id.year}-${r._id.month}`;
      if (!monthlyMap[key]) monthlyMap[key] = { year: r._id.year, month: r._id.month, revenue: 0, fuelCost: 0, miscCost: 0, maintCost: 0 };
      monthlyMap[key].revenue = r.revenue;
    });
    monthlyExpenses.forEach((r) => {
      const key = `${r._id.year}-${r._id.month}`;
      if (!monthlyMap[key]) monthlyMap[key] = { year: r._id.year, month: r._id.month, revenue: 0, fuelCost: 0, miscCost: 0, maintCost: 0 };
      monthlyMap[key].fuelCost = r.fuelCost;
      monthlyMap[key].miscCost = r.miscCost;
    });
    monthlyMaint.forEach((r) => {
      const key = `${r._id.year}-${r._id.month}`;
      if (!monthlyMap[key]) monthlyMap[key] = { year: r._id.year, month: r._id.month, revenue: 0, fuelCost: 0, miscCost: 0, maintCost: 0 };
      monthlyMap[key].maintCost = r.maintCost;
    });

    const monthlySummary = Object.values(monthlyMap)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map((m) => ({
        label: `${MONTHS[m.month - 1]} ${m.year}`,
        revenue: m.revenue,
        fuelCost: m.fuelCost,
        maintenance: m.maintCost,
        netProfit: m.revenue - m.fuelCost - m.miscCost - m.maintCost,
      }));

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

    // ── Fleet ROI ──
    const avgFuel =
      expenseTotals.count > 0
        ? expenseTotals.totalFuel / expenseTotals.count
        : 0;

    const totalExpenses =
      expenseTotals.totalFuel + expenseTotals.totalMisc + maintTotals.totalCost;

    // Revenue proxy: sum of estimatedFuelCost from delivered trips
    const revenueAgg = await Trip.aggregate([
      { $match: { status: "Delivered" } },
      { $group: { _id: null, totalRevenue: { $sum: "$estimatedFuelCost" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;
    const roiPercent = totalExpenses > 0
      ? parseFloat((((totalRevenue - totalExpenses) / totalExpenses) * 100).toFixed(1))
      : 0;

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
        totalRevenue,
        roiPercent,
      },
      fuelEfficiencyTrend,
      top5Costliest,
      monthlySummary,
      perVehicleCosts: perVehicleExpense,
      deadStock,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
