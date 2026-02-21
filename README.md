# FleetFlow: Modular Fleet & Logistics Management System

FleetFlow is a centralized, rule-based digital platform designed to replace manual logbooks and optimize the full lifecycle of a delivery fleet.

## Objective

Build a fleet and logistics hub that:
- Optimizes vehicle lifecycle and dispatch workflows
- Monitors driver safety and compliance
- Tracks fuel, maintenance, and operational financial performance

## Target Users

- **Fleet Managers**: Oversee vehicle health, asset lifecycle, and scheduling
- **Dispatchers**: Create trips, assign drivers, and validate cargo loads
- **Safety Officers**: Monitor compliance, license expirations, and safety scores
- **Financial Analysts**: Audit fuel spend, maintenance ROI, and operational costs

## Core System Pages

### 1) Login & Authentication
- Secure role-based login (Manager / Dispatcher / other roles)
- Email/Password authentication
- Forgot Password flow
- RBAC (Role-Based Access Control)

### 2) Command Center (Main Dashboard)
High-level fleet visibility with KPIs:
- Active Fleet (vehicles currently **On Trip**)
- Maintenance Alerts (vehicles **In Shop**)
- Utilization Rate (% assigned vs idle)
- Pending Cargo (unassigned shipments)

Filters:
- Vehicle Type (Truck, Van, Bike)
- Status
- Region

### 3) Vehicle Registry (Asset Management)
CRUD for vehicle assets with fields:
- Name / Model
- License Plate (**Unique ID**)
- Max Load Capacity (kg/tons)
- Odometer
- Out of Service / Retired toggle

### 4) Trip Dispatcher & Management
- Trip creation form: select **Available Vehicle** + **Available Driver**
- Validation rule: block creation if `CargoWeight > MaxCapacity`
- Trip lifecycle: `Draft → Dispatched → Completed → Cancelled`

Mockup:
- https://link.excalidraw.com/l/65VNwvy7c4X/9gLrP9aS4YZ

### 5) Maintenance & Service Logs
- Preventive and reactive maintenance logs
- Auto-logic: when added to service log, vehicle status becomes **In Shop**
- In-shop vehicles are hidden from dispatcher assignment pool

### 6) Completed Trip, Expense & Fuel Logging
- Record fuel liters, cost, and date
- Link entries to vehicle/trip
- Auto-calculate total operational cost per vehicle:
  - `Total Operational Cost = Fuel Cost + Maintenance Cost`

### 7) Driver Performance & Safety Profiles
- License expiry tracking (expired license blocks assignment)
- Trip completion rate tracking
- Safety score tracking
- Driver status: `On Duty / Off Duty / Suspended`

### 8) Operational Analytics & Financial Reports
Metrics:
- Fuel Efficiency = `km / L`
- Vehicle ROI:

  `ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost`

Exports:
- Monthly payroll and health audit exports (CSV/PDF)

## Logic & Workflow Summary

1. **Vehicle Intake**: Add `Van-05` (500 kg) → status: **Available**
2. **Compliance**: Add driver `Alex`; verify license validity for Van category
3. **Dispatching**: Assign `Alex` to `Van-05` with 450 kg load
   - Rule check: `450 < 500` ✅
   - Status update: Vehicle + Driver → **On Trip**
4. **Completion**: Driver marks trip done and enters final odometer
   - Status update: Vehicle + Driver → **Available**
5. **Maintenance**: Manager logs oil change
   - Auto-logic: Vehicle status → **In Shop**
   - Vehicle removed from dispatcher selection pool
6. **Analytics Update**: Cost-per-km recalculated using latest fuel logs

## Technical Requirements

- **Frontend**: Modular UI, scannable data tables, and status pills
- **Backend**: Real-time state management for vehicle/driver availability
- **Database**: Relational model linking trips and expenses to vehicle IDs

## Suggested Data Model (High Level)

- `users` (role, auth data)
- `drivers` (license info, status, safety score)
- `vehicles` (capacity, odometer, status)
- `trips` (origin/destination, cargo, lifecycle status, assigned vehicle/driver)
- `maintenance_logs` (vehicle, type, cost, date)
- `fuel_logs` (vehicle/trip, liters, cost, date)
- `expenses` (vehicle-linked operational expenses)

## Status Lifecycle Rules

- Vehicle status: `Available | On Trip | In Shop | Out of Service`
- Driver status: `On Duty | Off Duty | Suspended | On Trip`
- Assignment constraints:
  - Vehicle must be **Available**
  - Driver must be **On Duty** and license must be valid
  - Cargo must not exceed vehicle max capacity

## Hackathon Scope

- Build MVP modules for dispatch, asset management, compliance, and analytics
- Ensure data consistency across trip, fuel, and maintenance records
- Prioritize rule-based validations and role-specific workflows

## Repository Setup

```bash
git init
git add .
git commit -m "Initial commit: FleetFlow problem statement and README"
```

## License

Hackathon project (license to be decided by team).