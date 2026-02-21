const express = require("express");
const DriverProfile = require("../models/DriverProfile");
const Trip = require("../models/Trip");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// @route   GET /api/drivers
// @desc    Get all driver profiles with computed stats
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const profiles = await DriverProfile.find()
      .populate("user", "fullName email isActive")
      .sort({ createdAt: -1 });

    // Compute completion rate per driver
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const totalTrips = await Trip.countDocuments({ driver: p.user._id });
        const delivered = await Trip.countDocuments({
          driver: p.user._id,
          status: "Delivered",
        });
        const completionRate =
          totalTrips > 0 ? Math.round((delivered / totalTrips) * 100) : 0;

        // License expiry check
        const licenseExpired = new Date(p.licenseExpiry) < new Date();

        const obj = p.toObject();
        obj.completionRate = completionRate;
        obj.totalTrips = totalTrips;
        obj.licenseExpired = licenseExpired;
        return obj;
      })
    );

    // Search filter
    let result = enriched;
    if (search) {
      const q = search.toLowerCase();
      result = enriched.filter((d) =>
        d.user?.fullName?.toLowerCase().includes(q)
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/drivers
// @desc    Create a driver profile
router.post("/", async (req, res) => {
  try {
    const {
      user,
      fullName,
      email,
      phone,
      department,
      licenseNumber,
      licenseExpiry,
      licenseCategory,
      safetyScore,
      complaints,
      dutyStatus,
    } = req.body;

    let userId = user;

    // If no existing user id is provided, create a new driver user
    if (!userId) {
      if (!fullName) {
        return res
          .status(400)
          .json({ message: "Driver name (fullName) is required" });
      }

      let driverEmail = (email || "").trim();

      // If email is not provided, generate a unique placeholder email
      if (!driverEmail) {
        const slug = fullName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.|\.$/g, "");
        driverEmail = `${slug || "driver"}.${Date.now()}@fleetflow.test`;
      }

      const emailExists = await User.findOne({ email: driverEmail });
      if (emailExists) {
        return res
          .status(400)
          .json({ message: "Email already exists for another user" });
      }

      const newUser = await User.create({
        fullName,
        email: driverEmail,
        // Default password for non-logging-in drivers; can be reset later
        password: "driver123",
        role: "driver",
        phone,
        department,
        licenseNumber,
        licenseCategory,
        licenseExpiry,
        dutyStatus: dutyStatus || "On Duty",
        safetyScore: safetyScore ?? 100,
      });

      userId = newUser._id;
    } else {
      // If an existing user id is provided, keep their driver-related fields in sync
      await User.findByIdAndUpdate(
        userId,
        {
          licenseNumber,
          licenseCategory,
          licenseExpiry,
          dutyStatus,
          safetyScore,
        },
        { new: true }
      );
    }

    const exists = await DriverProfile.findOne({ user: userId });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Profile already exists for this user" });
    }

    const profile = await DriverProfile.create({
      user: userId,
      licenseNumber,
      licenseExpiry,
      safetyScore: safetyScore ?? 100,
      complaints: complaints ?? 0,
      dutyStatus: dutyStatus || "On Duty",
    });

    const populated = await DriverProfile.findById(profile._id).populate(
      "user",
      "fullName email isActive"
    );

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/drivers/:id
// @desc    Update a driver profile
router.put("/:id", async (req, res) => {
  try {
    const profile = await DriverProfile.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("user", "fullName email isActive");

    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/drivers/:id
router.delete("/:id", async (req, res) => {
  try {
    const profile = await DriverProfile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json({ message: "Driver profile removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
