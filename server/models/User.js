const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["fleet_manager", "dispatcher", "safety_officer", "financial_analyst", "driver"],
      required: [true, "Role is required"],
    },
    phone: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    licenseCategory: {
      type: String,
      enum: ["Truck", "Van", "Mini", "Bike", "Trailer", "Any", ""],
      default: "",
    },
    licenseExpiry: {
      type: Date,
      default: null,
    },
    dutyStatus: {
      type: String,
      enum: ["On Duty", "Off Duty", "Suspended"],
      default: "On Duty",
    },
    safetyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpire: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire — 15 minutes
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
