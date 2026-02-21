const express = require("express");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const STATIC_ADMIN = {
  id: "static-admin",
  fullName: "System Admin",
  email: "admin@gmail.com",
  password: "admin123",
  role: "admin",
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role, phone, department } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      role,
      phone,
      department,
    });

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Static super-admin login
    if (email === STATIC_ADMIN.email && password === STATIC_ADMIN.password) {
      return res.json({
        _id: STATIC_ADMIN.id,
        fullName: STATIC_ADMIN.fullName,
        email: STATIC_ADMIN.email,
        role: STATIC_ADMIN.role,
        token: generateToken(STATIC_ADMIN.id, STATIC_ADMIN.role),
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Account has been deactivated" });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

router.get(
  "/users",
  protect,
  authorize("fleet_manager", "dispatcher", "safety_officer"),
  async (req, res) => {
    try {
      const filter = { isActive: true };

      if (req.query.assignable === "true") {
        // Only real drivers should be assignable to trips
        filter.dutyStatus = "On Duty";
        filter.role = "driver";
      }

      const users = await User.find(filter)
        .select("_id fullName email role")
        .sort({ fullName: 1 });

      res.json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
