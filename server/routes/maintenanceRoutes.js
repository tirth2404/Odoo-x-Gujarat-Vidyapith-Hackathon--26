const express = require("express");
const MaintenanceLog = require("../models/MaintenanceLog");
const Vehicle = require("../models/Vehicle");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// @route   GET /api/maintenance
// @desc    Get all maintenance logs (with optional filters)
router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.issue = { $regex: search, $options: "i" };
    }

    const logs = await MaintenanceLog.find(filter)
      .populate("vehicle", "licensePlate model")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/maintenance
// @desc    Create a maintenance log (auto-sets vehicle to "In Shop")
router.post("/", async (req, res) => {
  try {
    const { vehicle: vehicleId, issue, date, cost } = req.body;

    // Check vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Create log
    const log = await MaintenanceLog.create({
      vehicle: vehicleId,
      issue,
      date,
      cost: cost || 0,
    });

    // AUTO-HIDE RULE: mark vehicle as "In Shop"
    vehicle.status = "In Shop";
    vehicle.assignedDriver = null;
    await vehicle.save();

    const populated = await MaintenanceLog.findById(log._id).populate(
      "vehicle",
      "licensePlate model"
    );

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/maintenance/:id
// @desc    Update a maintenance log (mark Completed → vehicle back to Available)
router.put("/:id", async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: "Log not found" });

    const prevStatus = log.status;

    // Update fields
    Object.assign(log, req.body);
    await log.save();

    // If status changed to "Completed", release the vehicle back to Available
    if (log.status === "Completed" && prevStatus !== "Completed") {
      const vehicle = await Vehicle.findById(log.vehicle);
      if (vehicle && vehicle.status === "In Shop") {
        vehicle.status = "Available";
        await vehicle.save();
      }
    }

    const populated = await MaintenanceLog.findById(log._id).populate(
      "vehicle",
      "licensePlate model"
    );

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/maintenance/:id
router.delete("/:id", async (req, res) => {
  try {
    const log = await MaintenanceLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: "Log not found" });

    // If the log was still open, consider releasing the vehicle
    if (log.status !== "Completed") {
      // Only release if no other open logs exist for this vehicle
      const otherOpen = await MaintenanceLog.countDocuments({
        vehicle: log.vehicle,
        status: { $ne: "Completed" },
      });
      if (otherOpen === 0) {
        const vehicle = await Vehicle.findById(log.vehicle);
        if (vehicle && vehicle.status === "In Shop") {
          vehicle.status = "Available";
          await vehicle.save();
        }
      }
    }

    res.json({ message: "Maintenance log removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
