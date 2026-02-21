import { useEffect, useState } from "react";
import axios from "axios";
import "./Analytics.css";

const API = "http://localhost:5000/api";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios
      .get(`${API}/analytics`, { headers })
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="analytics-page"><div className="table-loading">Loading analytics…</div></div>;
  }

  if (!data) {
    return <div className="analytics-page"><div className="table-empty">Unable to load analytics data.</div></div>;
  }

  const { fleet, trips, financials, perVehicleCosts, deadStock } = data;

  /* Simple bar renderer (pure CSS, no lib) */
  const Bar = ({ value, max, color }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
      <div className="an-bar">
        <div className="an-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    );
  };

  const handleExportCSV = () => {
    // Build CSV from perVehicleCosts
    const rows = [
      ["Plate", "Model", "Trips", "Distance", "Fuel Cost", "Misc Cost", "Total Cost", "Fuel Efficiency (km/₹)"],
      ...perVehicleCosts.map((v) => [
        v.licensePlate,
        v.model,
        v.trips,
        v.distance,
        v.fuelCost,
        v.miscCost,
        v.totalCost,
        v.fuelEfficiency,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fleet_report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="an-header">
        <div>
          <h2 className="an-title">Operational Analytics &amp; Financial Reports</h2>
          <p className="an-subtitle">Big-picture insights to drive smarter decisions</p>
        </div>
        <button className="btn btn--primary" onClick={handleExportCSV}>
          ↓ Export CSV
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="an-kpi-grid">
        <div className="an-kpi">
          <span className="an-kpi-val">{fleet.total}</span>
          <span className="an-kpi-lbl">Total Fleet</span>
          <span className="an-kpi-sub">{fleet.utilization}% utilization</span>
        </div>
        <div className="an-kpi">
          <span className="an-kpi-val">{trips.total}</span>
          <span className="an-kpi-lbl">Total Trips</span>
          <span className="an-kpi-sub">{trips.completionRate}% completed</span>
        </div>
        <div className="an-kpi">
          <span className="an-kpi-val">₹{financials.totalExpenses.toLocaleString()}</span>
          <span className="an-kpi-lbl">Total Expenses</span>
          <span className="an-kpi-sub">Fuel + Misc + Maint.</span>
        </div>
        <div className="an-kpi">
          <span className="an-kpi-val">{financials.totalDistance.toLocaleString()} km</span>
          <span className="an-kpi-lbl">Distance Covered</span>
          <span className="an-kpi-sub">Avg ₹{financials.avgFuelPerTrip}/trip fuel</span>
        </div>
      </div>

      {/* ── Fleet Breakdown ── */}
      <div className="an-section">
        <h3>Fleet Status Breakdown</h3>
        <div className="an-bars">
          <div className="an-bar-row">
            <span className="an-bar-label">Available</span>
            <Bar value={fleet.available} max={fleet.total} color="#10b981" />
            <span className="an-bar-num">{fleet.available}</span>
          </div>
          <div className="an-bar-row">
            <span className="an-bar-label">On Trip</span>
            <Bar value={fleet.onTrip} max={fleet.total} color="#2563eb" />
            <span className="an-bar-num">{fleet.onTrip}</span>
          </div>
          <div className="an-bar-row">
            <span className="an-bar-label">In Shop</span>
            <Bar value={fleet.inShop} max={fleet.total} color="#f59e0b" />
            <span className="an-bar-num">{fleet.inShop}</span>
          </div>
          <div className="an-bar-row">
            <span className="an-bar-label">Retired</span>
            <Bar value={fleet.retired} max={fleet.total} color="#94a3b8" />
            <span className="an-bar-num">{fleet.retired}</span>
          </div>
        </div>
      </div>

      {/* ── Financial Breakdown ── */}
      <div className="an-section">
        <h3>Financial Breakdown</h3>
        <div className="an-fin-grid">
          <div className="an-fin-card an-fin--fuel">
            <span className="an-fin-val">₹{financials.totalFuel.toLocaleString()}</span>
            <span className="an-fin-lbl">Total Fuel Cost</span>
          </div>
          <div className="an-fin-card an-fin--misc">
            <span className="an-fin-val">₹{financials.totalMisc.toLocaleString()}</span>
            <span className="an-fin-lbl">Total Misc Expense</span>
          </div>
          <div className="an-fin-card an-fin--maint">
            <span className="an-fin-val">₹{financials.totalMaintenance.toLocaleString()}</span>
            <span className="an-fin-lbl">Total Maintenance</span>
          </div>
        </div>
      </div>

      {/* ── Per-Vehicle Fuel Efficiency (ROI) ── */}
      <div className="an-section">
        <h3>Fleet ROI — Per Vehicle Costs (Top 10)</h3>
        {perVehicleCosts.length === 0 ? (
          <div className="table-empty">No expense data to analyze yet.</div>
        ) : (
          <div className="an-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Model</th>
                  <th>Trips</th>
                  <th>Distance</th>
                  <th>Fuel Cost</th>
                  <th>Misc Cost</th>
                  <th>Total Cost</th>
                  <th>Efficiency (km/₹)</th>
                </tr>
              </thead>
              <tbody>
                {perVehicleCosts.map((v, i) => (
                  <tr key={i}>
                    <td className="mono">{v.licensePlate}</td>
                    <td>{v.model}</td>
                    <td>{v.trips}</td>
                    <td>{v.distance.toLocaleString()} km</td>
                    <td>₹{v.fuelCost.toLocaleString()}</td>
                    <td>₹{v.miscCost.toLocaleString()}</td>
                    <td className="text-bold">₹{v.totalCost.toLocaleString()}</td>
                    <td>{v.fuelEfficiency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dead Stock Alerts ── */}
      <div className="an-section">
        <h3>
          Dead Stock Alerts
          <span className="an-count">{deadStock.length} idle vehicles</span>
        </h3>
        {deadStock.length === 0 ? (
          <div className="table-empty">All vehicles have been active in the last 30 days.</div>
        ) : (
          <div className="an-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Odometer</th>
                </tr>
              </thead>
              <tbody>
                {deadStock.map((v) => (
                  <tr key={v._id} className="row--warn">
                    <td className="mono">{v.licensePlate}</td>
                    <td>{v.model}</td>
                    <td>{v.type}</td>
                    <td>
                      <span className="badge badge--available">{v.status}</span>
                    </td>
                    <td>{Number(v.odometer).toLocaleString()} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
