const express = require("express");
const User = require("../models/User");
const Trip = require("../models/Trip");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

const allowedRoles = ["fleet_manager", "safety_officer"];

router.get("/summary", authorize(...allowedRoles), async (req, res) => {
  try {
    const users = await User.find({ isActive: true }).select(
      "_id fullName dutyStatus safetyScore licenseExpiry"
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const totalDrivers = users.length;
    const onDuty = users.filter((user) => user.dutyStatus === "On Duty").length;
    const offDuty = users.filter((user) => user.dutyStatus === "Off Duty").length;
    const suspended = users.filter((user) => user.dutyStatus === "Suspended").length;
    const expiredLicenses = users.filter(
      (user) => user.licenseExpiry && new Date(user.licenseExpiry) < today
    ).length;
    const expiringSoon = users.filter(
      (user) =>
        user.licenseExpiry &&
        new Date(user.licenseExpiry) >= today &&
        new Date(user.licenseExpiry) <= in30Days
    ).length;

    const avgSafetyScore =
      totalDrivers > 0
        ? Math.round(
            users.reduce((sum, user) => sum + (Number(user.safetyScore) || 0), 0) /
              totalDrivers
          )
        : 0;

    res.json({
      totalDrivers,
      onDuty,
      offDuty,
      suspended,
      expiredLicenses,
      expiringSoon,
      avgSafetyScore,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/drivers", authorize(...allowedRoles), async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select(
        "_id fullName email role department licenseNumber licenseCategory licenseExpiry dutyStatus safetyScore isActive"
      )
      .sort({ fullName: 1 });

    const userIds = users.map((user) => user._id);

    const tripStats = await Trip.aggregate([
      { $match: { driver: { $in: userIds } } },
      {
        $group: {
          _id: "$driver",
          totalTrips: { $sum: 1 },
          completedTrips: {
            $sum: {
              $cond: [{ $eq: ["$status", "Delivered"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const statsMap = new Map(
      tripStats.map((row) => [String(row._id), { totalTrips: row.totalTrips, completedTrips: row.completedTrips }])
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const drivers = users.map((user) => {
      const stats = statsMap.get(String(user._id)) || { totalTrips: 0, completedTrips: 0 };
      const completionRate =
        stats.totalTrips > 0
          ? Math.round((stats.completedTrips / stats.totalTrips) * 100)
          : 0;

      const isLicenseExpired =
        !!user.licenseExpiry && new Date(user.licenseExpiry) < today;

      return {
        ...user.toObject(),
        totalTrips: stats.totalTrips,
        completedTrips: stats.completedTrips,
        completionRate,
        isLicenseExpired,
      };
    });

    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/drivers/:id", authorize(...allowedRoles), async (req, res) => {
  try {
    const updates = {
      licenseNumber: req.body.licenseNumber,
      licenseCategory: req.body.licenseCategory,
      licenseExpiry: req.body.licenseExpiry,
      dutyStatus: req.body.dutyStatus,
      safetyScore: req.body.safetyScore,
      isActive: req.body.isActive,
    };

    Object.keys(updates).forEach((key) => {
      if (typeof updates[key] === "undefined") {
        delete updates[key];
      }
    });

    const driver = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select(
      "_id fullName email role department licenseNumber licenseCategory licenseExpiry dutyStatus safetyScore isActive"
    );

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
