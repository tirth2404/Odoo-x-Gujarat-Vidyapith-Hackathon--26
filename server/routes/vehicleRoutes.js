const express = require("express");
const Vehicle = require("../models/Vehicle");
const Trip = require("../models/Trip");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All vehicle routes are protected
router.use(protect);

// @route   GET /api/vehicles
// @desc    Get all vehicles (with optional filters)
router.get(
  "/",
  authorize("fleet_manager", "dispatcher", "safety_officer", "financial_analyst"),
  async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { licensePlate: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }

    const vehicles = await Vehicle.find(filter)
      .populate("assignedDriver", "fullName")
      .sort({ createdAt: -1 });

    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  }
);

// @route   GET /api/vehicles/stats
// @desc    Get fleet KPI statistics
router.get(
  "/stats",
  authorize("fleet_manager", "dispatcher", "safety_officer", "financial_analyst"),
  async (req, res) => {
  try {
    const [activeFleet, maintenanceAlerts, available, total, pendingCargo] =
      await Promise.all([
        Vehicle.countDocuments({ status: "On Trip" }),
        Vehicle.countDocuments({ status: "In Shop" }),
        Vehicle.countDocuments({ status: "Available" }),
        Vehicle.countDocuments(),
        Trip.countDocuments({ status: "Pending" }),
      ]);

    const utilization =
      total > 0 ? Math.round((activeFleet / total) * 100) : 0;

    res.json({
      activeFleet,
      maintenanceAlerts,
      available,
      total,
      utilization,
      pendingCargo,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  }
);

// @route   POST /api/vehicles
// @desc    Create a new vehicle
router.post("/", authorize("fleet_manager"), async (req, res) => {
  try {
    const { licensePlate, model, type, maxCapacity, capacityUnit, odometer } =
      req.body;

    const exists = await Vehicle.findOne({ licensePlate: licensePlate.toUpperCase() });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Vehicle with this license plate already exists" });
    }

    const vehicle = await Vehicle.create({
      licensePlate,
      model,
      type,
      maxCapacity,
      capacityUnit,
      odometer,
    });

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/vehicles/:id
// @desc    Update a vehicle
router.put("/:id", authorize("fleet_manager"), async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/vehicles/:id
// @desc    Delete a vehicle
router.delete("/:id", authorize("fleet_manager"), async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({ message: "Vehicle removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
