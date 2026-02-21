import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./Expenses.css";

const API = "http://localhost:5000/api";

const fuelFormInitial = {
  trip: "",
  vehicle: "",
  liters: "",
  cost: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

const expenseFormInitial = {
  trip: "",
  vehicle: "",
  category: "Other",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function Expenses() {
  const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(true);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenseLogs, setExpenseLogs] = useState([]);
  const [summary, setSummary] = useState({ totals: null, perVehicle: [] });
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [fuelForm, setFuelForm] = useState(fuelFormInitial);
  const [expenseForm, setExpenseForm] = useState(expenseFormInitial);
  const [error, setError] = useState("");

  const deliveredTrips = useMemo(
    () => trips.filter((trip) => trip.status === "Delivered"),
    [trips]
  );

  const loadPageData = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/expenses/fuel`, { headers }),
      axios.get(`${API}/expenses/other`, { headers }),
      axios.get(`${API}/expenses/summary`, { headers }),
      axios.get(`${API}/trips?status=Delivered`, { headers }),
      axios.get(`${API}/vehicles`, { headers }),
    ])
      .then(([fuelRes, expenseRes, summaryRes, tripsRes, vehiclesRes]) => {
        setFuelLogs(fuelRes.data);
        setExpenseLogs(expenseRes.data);
        setSummary(summaryRes.data);
        setTrips(tripsRes.data);
        setVehicles(vehiclesRes.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load expense data");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const onSelectFuelTrip = (tripId) => {
    const selected = deliveredTrips.find((trip) => trip._id === tripId);
    setFuelForm((prev) => ({
      ...prev,
      trip: tripId,
      vehicle: selected?.vehicle?._id || "",
    }));
  };

  const onSelectExpenseTrip = (tripId) => {
    const selected = deliveredTrips.find((trip) => trip._id === tripId);
    setExpenseForm((prev) => ({
      ...prev,
      trip: tripId,
      vehicle: selected?.vehicle?._id || prev.vehicle,
    }));
  };

  const submitFuel = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API}/expenses/fuel`, fuelForm, { headers });
      setFuelForm(fuelFormInitial);
      loadPageData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add fuel log");
    }
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API}/expenses/other`, expenseForm, { headers });
      setExpenseForm(expenseFormInitial);
      loadPageData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add expense log");
    }
  };

  const totals = summary.totals || {
    totalFuelCost: 0,
    totalFuelLiters: 0,
    totalMaintenanceCost: 0,
    totalOtherExpense: 0,
    totalOperationalCost: 0,
  };

  return (
    <div className="expenses-page">
      <div className="ex-header">
        <div>
          <h2 className="ex-title">Trip & Expense Logging</h2>
          <p className="ex-subtitle">Fuel, expense and total operational cost tracking</p>
        </div>
      </div>

      {error && <div className="ex-error">{error}</div>}

      <div className="ex-kpis">
        <div className="ex-kpi-card">
          <span className="kpi-label">Fuel Cost</span>
          <span className="kpi-value">₹{Number(totals.totalFuelCost).toLocaleString()}</span>
        </div>
        <div className="ex-kpi-card">
          <span className="kpi-label">Fuel Liters</span>
          <span className="kpi-value">{Number(totals.totalFuelLiters).toLocaleString()} L</span>
        </div>
        <div className="ex-kpi-card">
          <span className="kpi-label">Maintenance Cost</span>
          <span className="kpi-value">₹{Number(totals.totalMaintenanceCost).toLocaleString()}</span>
        </div>
        <div className="ex-kpi-card ex-kpi-card--accent">
          <span className="kpi-label">Total Operational Cost</span>
          <span className="kpi-value">₹{Number(totals.totalOperationalCost).toLocaleString()}</span>
        </div>
      </div>

      <div className="ex-form-grid">
        <form className="ex-card" onSubmit={submitFuel}>
          <h3>Log Fuel</h3>
          <label>
            Completed Trip
            <select value={fuelForm.trip} onChange={(e) => onSelectFuelTrip(e.target.value)}>
              <option value="">— optional —</option>
              {deliveredTrips.map((trip) => (
                <option key={trip._id} value={trip._id}>
                  {trip.origin} → {trip.destination} ({trip.vehicle?.licensePlate})
                </option>
              ))}
            </select>
          </label>
          <label>
            Vehicle
            <select
              required
              value={fuelForm.vehicle}
              onChange={(e) => setFuelForm({ ...fuelForm, vehicle: e.target.value })}
            >
              <option value="">— select vehicle —</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.licensePlate} — {vehicle.model}
                </option>
              ))}
            </select>
          </label>
          <div className="ex-two-col">
            <label>
              Liters
              <input
                required
                type="number"
                min="0"
                value={fuelForm.liters}
                onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })}
              />
            </label>
            <label>
              Cost (₹)
              <input
                required
                type="number"
                min="0"
                value={fuelForm.cost}
                onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })}
              />
            </label>
          </div>
          <label>
            Date
            <input
              required
              type="date"
              value={fuelForm.date}
              onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
            />
          </label>
          <label>
            Note
            <input
              type="text"
              value={fuelForm.note}
              onChange={(e) => setFuelForm({ ...fuelForm, note: e.target.value })}
              placeholder="Optional note"
            />
          </label>
          <button className="btn btn--accent" type="submit">Save Fuel Log</button>
        </form>

        <form className="ex-card" onSubmit={submitExpense}>
          <h3>Log Other Expense</h3>
          <label>
            Completed Trip
            <select value={expenseForm.trip} onChange={(e) => onSelectExpenseTrip(e.target.value)}>
              <option value="">— optional —</option>
              {deliveredTrips.map((trip) => (
                <option key={trip._id} value={trip._id}>
                  {trip.origin} → {trip.destination} ({trip.vehicle?.licensePlate})
                </option>
              ))}
            </select>
          </label>
          <label>
            Vehicle
            <select
              required
              value={expenseForm.vehicle}
              onChange={(e) => setExpenseForm({ ...expenseForm, vehicle: e.target.value })}
            >
              <option value="">— select vehicle —</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.licensePlate} — {vehicle.model}
                </option>
              ))}
            </select>
          </label>
          <div className="ex-two-col">
            <label>
              Category
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              >
                <option value="Toll">Toll</option>
                <option value="Parking">Parking</option>
                <option value="Repair">Repair</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Amount (₹)
              <input
                required
                type="number"
                min="0"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              />
            </label>
          </div>
          <label>
            Date
            <input
              required
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
            />
          </label>
          <label>
            Note
            <input
              type="text"
              value={expenseForm.note}
              onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
              placeholder="Optional note"
            />
          </label>
          <button className="btn btn--primary" type="submit">Save Expense</button>
        </form>
      </div>

      <div className="ex-table-grid">
        <div className="ex-table-card">
          <h3>Fuel Logs</h3>
          {loading ? (
            <div className="table-loading">Loading…</div>
          ) : fuelLogs.length === 0 ? (
            <div className="table-empty">No fuel logs yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Liters</th>
                  <th>Cost</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.vehicle?.licensePlate || "—"}</td>
                    <td>{Number(log.liters).toLocaleString()} L</td>
                    <td>₹{Number(log.cost).toLocaleString()}</td>
                    <td>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ex-table-card">
          <h3>Other Expenses</h3>
          {loading ? (
            <div className="table-loading">Loading…</div>
          ) : expenseLogs.length === 0 ? (
            <div className="table-empty">No expense logs yet.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {expenseLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.vehicle?.licensePlate || "—"}</td>
                    <td>{log.category}</td>
                    <td>₹{Number(log.amount).toLocaleString()}</td>
                    <td>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="ex-table-card">
        <h3>Operational Cost by Vehicle</h3>
        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : summary.perVehicle.length === 0 ? (
          <div className="table-empty">No vehicle cost data yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Fuel Cost</th>
                <th>Maintenance</th>
                <th>Other</th>
                <th>Total Operational Cost</th>
              </tr>
            </thead>
            <tbody>
              {summary.perVehicle.map((row) => (
                <tr key={row.vehicleId}>
                  <td>{row.licensePlate} — {row.model}</td>
                  <td>₹{Number(row.totalFuelCost).toLocaleString()}</td>
                  <td>₹{Number(row.totalMaintenanceCost).toLocaleString()}</td>
                  <td>₹{Number(row.totalOtherExpense).toLocaleString()}</td>
                  <td><strong>₹{Number(row.totalOperationalCost).toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
