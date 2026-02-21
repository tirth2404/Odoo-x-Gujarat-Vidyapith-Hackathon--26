const express = require("express");
const Trip = require("../models/Trip");
const Vehicle = require("../models/Vehicle");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// @route   GET /api/trips
// @desc    Get all trips (with optional filters)
router.get(
  "/",
  authorize("fleet_manager", "dispatcher", "safety_officer", "financial_analyst"),
  async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { origin: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
      ];
    }

    const trips = await Trip.find(filter)
      .populate("vehicle", "licensePlate model type maxCapacity capacityUnit")
      .populate("driver", "fullName")
      .sort({ createdAt: -1 });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
  }
);

// @route   POST /api/trips
// @desc    Create a new trip (with capacity validation)
router.post("/", authorize("fleet_manager", "dispatcher"), async (req, res) => {
  try {
    const { vehicle: vehicleId, driver, cargoWeight, origin, destination, estimatedFuelCost } = req.body;

    // 0. Check driver exists and is active
    const driverUser = await User.findById(driver);
    if (!driverUser) {
      return res.status(404).json({ message: "Driver not found" });
    }
    if (!driverUser.isActive) {
      return res.status(400).json({ message: "Selected driver is not active" });
    }

    // 1. Check vehicle exists and is Available
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }
    if (vehicle.status !== "Available") {
      return res.status(400).json({
        message: `Vehicle is currently "${vehicle.status}" and cannot be dispatched`,
      });
    }

    // 2. Capacity validation — normalise to kg for comparison
    let maxKg = vehicle.maxCapacity;
    if (vehicle.capacityUnit === "ton") maxKg = vehicle.maxCapacity * 1000;

    if (Number(cargoWeight) > maxKg) {
      return res.status(400).json({
        message: `Too heavy! Cargo ${cargoWeight} kg exceeds vehicle capacity of ${maxKg} kg`,
      });
    }

    // 3. Create trip
    const trip = await Trip.create({
      vehicle: vehicleId,
      driver,
      cargoWeight,
      origin,
      destination,
      estimatedFuelCost,
      status: "Pending",
    });

    // 4. Mark vehicle as "On Trip" and assign driver
    vehicle.status = "On Trip";
    vehicle.assignedDriver = driver;
    await vehicle.save();

    const populated = await Trip.findById(trip._id)
      .populate("vehicle", "licensePlate model type maxCapacity capacityUnit")
      .populate("driver", "fullName");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/trips/:id/status
// @desc    Advance trip status (Pending → On Way → Delivered | Cancelled)
router.put("/:id/status", authorize("fleet_manager", "dispatcher"), async (req, res) => {
  try {
    const { status } = req.body;
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    const allowed = ["Pending", "On Way", "Delivered", "Cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    trip.status = status;
    await trip.save();

    // If delivered or cancelled, free the vehicle
    if (status === "Delivered" || status === "Cancelled") {
      const vehicle = await Vehicle.findById(trip.vehicle);
      if (vehicle) {
        vehicle.status = "Available";
        vehicle.assignedDriver = null;
        await vehicle.save();
      }
    }

    const populated = await Trip.findById(trip._id)
      .populate("vehicle", "licensePlate model type maxCapacity capacityUnit")
      .populate("driver", "fullName");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/trips/:id
router.delete("/:id", authorize("fleet_manager", "dispatcher"), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Free vehicle if trip was active
    if (trip.status === "Pending" || trip.status === "On Way") {
      const vehicle = await Vehicle.findById(trip.vehicle);
      if (vehicle) {
        vehicle.status = "Available";
        vehicle.assignedDriver = null;
        await vehicle.save();
      }
    }

    await Trip.findByIdAndDelete(req.params.id);
    res.json({ message: "Trip removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
