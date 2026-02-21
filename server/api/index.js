const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("../config/db");

dotenv.config();

const app = express();

// Connect to MongoDB (reuses existing connection in serverless)
connectDB();

// Middleware
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);
            // Allow any Vercel deployment or localhost
            if (
                /^https:\/\/.*\.vercel\.app$/.test(origin) ||
                /^http:\/\/localhost(:\d+)?$/.test(origin)
            ) {
                callback(null, true);
            } else {
                callback(null, true); // allow all in production for now
            }
        },
        credentials: true,
    })
);
app.use(express.json());

// Routes
app.use("/api/auth", require("../routes/authRoutes"));
app.use("/api/vehicles", require("../routes/vehicleRoutes"));
app.use("/api/trips", require("../routes/tripRoutes"));
app.use("/api/maintenance", require("../routes/maintenanceRoutes"));
app.use("/api/expenses", require("../routes/expenseRoutes"));
app.use("/api/drivers", require("../routes/driverRoutes"));
app.use("/api/analytics", require("../routes/analyticsRoutes"));

// Health check
app.get("/", (req, res) => {
    res.json({ message: "FleetFlow API is running" });
});
app.get("/api", (req, res) => {
    res.json({ message: "FleetFlow API is running" });
});

module.exports = app;
