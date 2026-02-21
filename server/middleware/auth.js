const jwt = require("jsonwebtoken");
const User = require("../models/User");

const STATIC_ADMIN = {
  id: "static-admin",
  fullName: "System Admin",
  email: "admin@gmail.com",
  role: "admin",
};

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role === "admin" && decoded.id === STATIC_ADMIN.id) {
        req.user = {
          _id: STATIC_ADMIN.id,
          fullName: STATIC_ADMIN.fullName,
          email: STATIC_ADMIN.email,
          role: STATIC_ADMIN.role,
        };
        return next();
      }

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user?.role === "admin") {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
