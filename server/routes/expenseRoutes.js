const express = require("express");
const Expense = require("../models/Expense");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

// @route   GET /api/expenses
// @desc    Get all expenses (with optional filters)
router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const expenses = await Expense.find(filter)
      .populate({
        path: "trip",
        select: "origin destination vehicle cargoWeight",
        populate: { path: "vehicle", select: "licensePlate model" },
      })
      .populate("driver", "fullName")
      .sort({ createdAt: -1 });

    // If search, filter by driver name client-side (populated field)
    let result = expenses;
    if (search) {
      const q = search.toLowerCase();
      result = expenses.filter(
        (e) =>
          e.driver?.fullName?.toLowerCase().includes(q) ||
          e.trip?.vehicle?.licensePlate?.toLowerCase().includes(q)
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/expenses/summary
// @desc    Per-vehicle cost summary (fuel + misc + maintenance)
router.get("/summary", async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$trip",
          totalFuel: { $sum: "$fuelCost" },
          totalMisc: { $sum: "$miscExpense" },
          totalDistance: { $sum: "$distance" },
          count: { $sum: 1 },
        },
      },
    ];
    const grouped = await Expense.aggregate(pipeline);
    res.json(grouped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/expenses
router.post("/", async (req, res) => {
  try {
    const { trip, driver, distance, fuelCost, miscExpense } = req.body;

    const expense = await Expense.create({
      trip,
      driver,
      distance,
      fuelCost,
      miscExpense,
    });

    const populated = await Expense.findById(expense._id)
      .populate({
        path: "trip",
        select: "origin destination vehicle cargoWeight",
        populate: { path: "vehicle", select: "licensePlate model" },
      })
      .populate("driver", "fullName");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/expenses/:id
router.put("/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: "trip",
        select: "origin destination vehicle cargoWeight",
        populate: { path: "vehicle", select: "licensePlate model" },
      })
      .populate("driver", "fullName");

    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/expenses/:id
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
