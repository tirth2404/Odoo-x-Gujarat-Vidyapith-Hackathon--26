/**
 * seedToyData.js — Adds EXTRA historical trips, expenses, maintenance & driver
 * profiles to the existing database WITHOUT touching users or vehicles.
 *
 * Run:  node seedToyData.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");
const Vehicle = require("./models/Vehicle");
const Trip = require("./models/Trip");
const Expense = require("./models/Expense");
const MaintenanceLog = require("./models/MaintenanceLog");
const DriverProfile = require("./models/DriverProfile");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // ── Fetch existing references ─────────────────────────────────
  const users = await User.find({}).select("_id email role fullName");
  const vehicles = await Vehicle.find({}).select("_id licensePlate model");

  if (!users.length || !vehicles.length) {
    console.error("No users or vehicles found — run the main seed first!");
    process.exit(1);
  }

  // Build lookup maps
  const userByEmail = {};
  users.forEach((u) => (userByEmail[u.email] = u));

  const vehicleByPlate = {};
  vehicles.forEach((v) => (vehicleByPlate[v.licensePlate] = v));

  // Shorthand helpers
  const u = (email) => userByEmail[email]?._id;
  const v = (plate) => vehicleByPlate[plate]?._id;

  const drivers = [
    u("riya@fleetflow.in"),
    u("arjun@fleetflow.in"),
    u("meera@fleetflow.in"),
    u("vikram@fleetflow.in"),
    u("karan@fleetflow.in"),
  ].filter(Boolean);

  const vIds = vehicles.map((x) => x._id);

  // ── Helper: create a date in the past ─────────────────────────
  const d = (year, month, day) => new Date(year, month - 1, day);

  // ── 1. Extra TRIPS (spread May 2025 → Oct 2025 to fill chart gaps) ──
  const routes = [
    { origin: "Ahmedabad", destination: "Mumbai", cargo: 9500, fuel: 35000 },
    { origin: "Surat", destination: "Goa", cargo: 3200, fuel: 18000 },
    { origin: "Rajkot", destination: "Ahmedabad", cargo: 4500, fuel: 8000 },
    { origin: "Vadodara", destination: "Surat", cargo: 2000, fuel: 6500 },
    { origin: "Gandhinagar", destination: "Udaipur", cargo: 5500, fuel: 22000 },
    { origin: "Ahmedabad", destination: "Jaipur", cargo: 7000, fuel: 28000 },
    { origin: "Surat", destination: "Nashik", cargo: 1800, fuel: 9500 },
    { origin: "Rajkot", destination: "Indore", cargo: 8200, fuel: 32000 },
    { origin: "Ahmedabad", destination: "Baroda", cargo: 600, fuel: 4000 },
    { origin: "Vadodara", destination: "Pune", cargo: 4200, fuel: 15000 },
    { origin: "Gandhinagar", destination: "Delhi", cargo: 9800, fuel: 42000 },
    { origin: "Surat", destination: "Ahmedabad", cargo: 1500, fuel: 7000 },
    { origin: "Ahmedabad", destination: "Rajkot", cargo: 3000, fuel: 9000 },
    { origin: "Mumbai", destination: "Surat", cargo: 6500, fuel: 20000 },
    { origin: "Pune", destination: "Ahmedabad", cargo: 5000, fuel: 25000 },
    { origin: "Jaipur", destination: "Gandhinagar", cargo: 4000, fuel: 19000 },
    { origin: "Udaipur", destination: "Ahmedabad", cargo: 2800, fuel: 12000 },
    { origin: "Surat", destination: "Vadodara", cargo: 1200, fuel: 5000 },
  ];

  const tripDates = [
    d(2025, 5, 3),  d(2025, 5, 15), d(2025, 5, 25),
    d(2025, 6, 2),  d(2025, 6, 14), d(2025, 6, 28),
    d(2025, 7, 5),  d(2025, 7, 18), d(2025, 7, 29),
    d(2025, 8, 4),  d(2025, 8, 16), d(2025, 8, 27),
    d(2025, 9, 3),  d(2025, 9, 14), d(2025, 9, 23),
    d(2025, 10, 5), d(2025, 10, 17), d(2025, 10, 28),
  ];

  const statuses = [
    "Delivered", "Delivered", "Delivered",
    "Delivered", "Delivered", "Cancelled",
    "Delivered", "Delivered", "Delivered",
    "Delivered", "Delivered", "Delivered",
    "Delivered", "Cancelled", "Delivered",
    "Delivered", "Delivered", "Delivered",
  ];

  const newTrips = [];
  for (let i = 0; i < routes.length; i++) {
    const r = routes[i];
    newTrips.push({
      vehicle: vIds[i % vIds.length],
      driver: drivers[i % drivers.length],
      origin: r.origin,
      destination: r.destination,
      cargoWeight: r.cargo,
      estimatedFuelCost: r.fuel,
      status: statuses[i],
      createdAt: tripDates[i],
      updatedAt: tripDates[i],
    });
  }

  const insertedTrips = await Trip.insertMany(newTrips);
  console.log(`✓ Inserted ${insertedTrips.length} extra trips (May–Oct 2025)`);

  // ── 2. Extra EXPENSES (one per delivered trip) ───────────────────
  const newExpenses = [];
  for (const trip of insertedTrips) {
    if (trip.status !== "Delivered") continue;

    const dist = Math.round(150 + Math.random() * 800);
    const fuelCost = Math.round(dist * (8 + Math.random() * 12));
    const misc = Math.round(300 + Math.random() * 2500);
    const statusOpts = ["Done", "Approved", "Pending"];
    const tripAge = (Date.now() - trip.createdAt.getTime()) / 86400000;
    const expStatus = tripAge > 60 ? "Done" : tripAge > 30 ? "Approved" : "Pending";

    const expDate = new Date(trip.createdAt);
    expDate.setDate(expDate.getDate() + 2); // 2 days after trip

    newExpenses.push({
      trip: trip._id,
      driver: trip.driver,
      distance: dist,
      fuelCost,
      miscExpense: misc,
      status: expStatus,
      createdAt: expDate,
      updatedAt: expDate,
    });
  }

  const insertedExpenses = await Expense.insertMany(newExpenses);
  console.log(`✓ Inserted ${insertedExpenses.length} extra expenses`);

  // ── 3. Extra MAINTENANCE logs (spread across months) ─────────────
  const maintData = [
    { veh: "GJ-01-AB-1234", issue: "Battery replacement", cost: 6500, status: "Completed", date: d(2025, 5, 10) },
    { veh: "GJ-03-EF-9012", issue: "AC compressor repair", cost: 12000, status: "Completed", date: d(2025, 6, 5) },
    { veh: "GJ-07-GH-3456", issue: "Clutch plate replacement", cost: 18000, status: "Completed", date: d(2025, 6, 20) },
    { veh: "GJ-05-CD-5678", issue: "Radiator flush + coolant", cost: 4200, status: "Completed", date: d(2025, 7, 12) },
    { veh: "GJ-12-IJ-7890", issue: "Suspension spring replacement", cost: 15000, status: "Completed", date: d(2025, 8, 3) },
    { veh: "GJ-09-KL-2345", issue: "Chain & sprocket kit", cost: 3500, status: "Completed", date: d(2025, 8, 22) },
    { veh: "GJ-01-AB-1234", issue: "Timing belt replacement", cost: 8500, status: "Completed", date: d(2025, 9, 8) },
    { veh: "GJ-03-EF-9012", issue: "Windshield crack repair", cost: 5000, status: "Completed", date: d(2025, 9, 25) },
    { veh: "GJ-07-GH-3456", issue: "Fuel injector cleaning", cost: 7500, status: "Completed", date: d(2025, 10, 10) },
    { veh: "GJ-05-CD-5678", issue: "Full body repaint", cost: 25000, status: "Completed", date: d(2025, 10, 28) },
  ];

  const newMaint = maintData.map((m) => ({
    vehicle: v(m.veh),
    issue: m.issue,
    cost: m.cost,
    status: m.status,
    date: m.date,
    createdAt: m.date,
    updatedAt: m.date,
  }));

  const insertedMaint = await MaintenanceLog.insertMany(newMaint);
  console.log(`✓ Inserted ${insertedMaint.length} extra maintenance logs`);

  // ── 4. Extra DRIVER PROFILES (for users who don't have one yet) ──
  const existingProfiles = await DriverProfile.find({}).select("user");
  const existingUserIds = new Set(existingProfiles.map((p) => p.user.toString()));

  const profileData = [
    { email: "vikram@fleetflow.in", license: "GJ-DL-20200078", expiry: d(2027, 9, 10), score: 88, complaints: 2, duty: "On Duty" },
    { email: "karan@fleetflow.in", license: "GJ-DL-20210156", expiry: d(2028, 1, 25), score: 95, complaints: 0, duty: "On Duty" },
    { email: "kunjrabadia@gmail.com", license: "GJ-DL-20220034", expiry: d(2027, 11, 5), score: 72, complaints: 4, duty: "Off Duty" },
    { email: "manan@gmail.com", license: "GJ-DL-20230091", expiry: d(2028, 5, 18), score: 84, complaints: 1, duty: "On Duty" },
  ];

  const newProfiles = [];
  for (const p of profileData) {
    const userId = u(p.email);
    if (!userId || existingUserIds.has(userId.toString())) continue;
    newProfiles.push({
      user: userId,
      licenseNumber: p.license,
      licenseExpiry: p.expiry,
      safetyScore: p.score,
      complaints: p.complaints,
      dutyStatus: p.duty,
    });
  }

  if (newProfiles.length) {
    const insertedProfiles = await DriverProfile.insertMany(newProfiles);
    console.log(`✓ Inserted ${insertedProfiles.length} extra driver profiles`);
  } else {
    console.log("✓ All driver profiles already exist — skipped");
  }

  // ── Summary ───────────────────────────────────────────────────────
  const totals = {
    trips: await Trip.countDocuments(),
    expenses: await Expense.countDocuments(),
    maintenance: await MaintenanceLog.countDocuments(),
    driverProfiles: await DriverProfile.countDocuments(),
  };
  console.log("\n📊 Database totals after seeding:");
  console.log(`   Trips:           ${totals.trips}`);
  console.log(`   Expenses:        ${totals.expenses}`);
  console.log(`   Maintenance:     ${totals.maintenance}`);
  console.log(`   Driver Profiles: ${totals.driverProfiles}`);
  console.log("\n✅ Toy data seeded successfully! No users or vehicles were modified.");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
