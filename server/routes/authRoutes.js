const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
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
  if (req.user.role === "admin" && String(req.user._id) === STATIC_ADMIN.id) {
    return res.json({
      _id: STATIC_ADMIN.id,
      fullName: STATIC_ADMIN.fullName,
      email: STATIC_ADMIN.email,
      role: STATIC_ADMIN.role,
      phone: "",
      department: "Administration",
      licenseNumber: "",
      licenseCategory: "",
      licenseExpiry: null,
      dutyStatus: "On Duty",
      safetyScore: 100,
      isActive: true,
    });
  }

  res.json(req.user);
});

// @route   PUT /api/auth/me
// @desc    Update current logged-in user profile
// @access  Private
router.put("/me", protect, async (req, res) => {
  try {
    const allowedFields = [
      "fullName",
      "phone",
      "department",
      "licenseNumber",
      "licenseCategory",
      "licenseExpiry",
      "dutyStatus",
      "safetyScore",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (req.user.role === "admin" && String(req.user._id) === STATIC_ADMIN.id) {
      const adminProfile = {
        _id: STATIC_ADMIN.id,
        fullName: updates.fullName || STATIC_ADMIN.fullName,
        email: STATIC_ADMIN.email,
        role: STATIC_ADMIN.role,
        phone: updates.phone || "",
        department: updates.department || "Administration",
        licenseNumber: updates.licenseNumber || "",
        licenseCategory: updates.licenseCategory || "",
        licenseExpiry: updates.licenseExpiry || null,
        dutyStatus: updates.dutyStatus || "On Duty",
        safetyScore:
          updates.safetyScore !== undefined ? Number(updates.safetyScore) : 100,
        isActive: true,
      };

      return res.json(adminProfile);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    Object.entries(updates).forEach(([key, value]) => {
      user[key] = value;
    });

    await user.save();

    res.json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      phone: user.phone,
      department: user.department,
      licenseNumber: user.licenseNumber,
      licenseCategory: user.licenseCategory,
      licenseExpiry: user.licenseExpiry,
      dutyStatus: user.dutyStatus,
      safetyScore: user.safetyScore,
      isActive: user.isActive,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
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

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Please provide an email address" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "No account found with that email" });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL pointing to the frontend
    const clientURL = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientURL}/reset-password/${resetToken}`;

    res.json({
      message: "Reset link generated successfully",
      resetUrl,
    });
  } catch (error) {
    console.error("Forgot-password error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password using token
// @access  Public
router.put("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Hash the token from the URL to match the stored hash
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Set the new password and clear reset fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You can now login." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
