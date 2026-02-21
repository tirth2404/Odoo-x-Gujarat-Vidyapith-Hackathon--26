import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const API = "http://localhost:5000/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeFleet: 0,
    maintenanceAlerts: 0,
    pendingCargo: 0,
    utilization: 0,
    total: 0,
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(`${API}/vehicles/stats`, { headers }),
      axios.get(`${API}/vehicles`, { headers }),
    ])
      .then(([statsRes, vehiclesRes]) => {
        setStats(statsRes.data);
        setVehicles(vehiclesRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status) => {
    const map = {
      Available: "badge--available",
      "On Trip": "badge--ontrip",
      "In Shop": "badge--inshop",
      Retired: "badge--retired",
    };
    return <span className={`badge ${map[status] || ""}`}>{status}</span>;
  };

  return (
    <div className="dashboard">
      {/* Header row */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Dashboard</h2>
          <p className="dash-subtitle">Fleet management command center</p>
        </div>
        <div className="dash-actions">
          <button className="btn btn--primary" onClick={() => navigate("/trips")}>+ New Trip</button>
          <button className="btn btn--outline" onClick={() => navigate("/vehicles")}>
            + New Vehicle
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.activeFleet}</span>
            <span className="kpi-label">Active Fleet</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.maintenanceAlerts}</span>
            <span className="kpi-label">Maintenance Alerts</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.pendingCargo}</span>
            <span className="kpi-label">Pending Cargo</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.utilization}%</span>
            <span className="kpi-label">Utilization</span>
          </div>
        </div>
      </div>

      {/* Vehicles / Fleet table */}
      <div className="dash-table-section">
        <div className="table-header">
          <h3>Fleet Overview</h3>
          <div className="table-controls">
            <button className="ctrl-btn">Group by</button>
            <button className="ctrl-btn">Filter</button>
            <button className="ctrl-btn">Sort by</button>
          </div>
        </div>

        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : vehicles.length === 0 ? (
          <div className="table-empty">
            No vehicles registered yet. Click <strong>+ New Vehicle</strong> to add one.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Plate</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Odometer</th>
                  <th>Status</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, i) => (
                  <tr key={v._id}>
                    <td>{i + 1}</td>
                    <td className="mono">{v.licensePlate}</td>
                    <td>{v.model}</td>
                    <td>{v.type}</td>
                    <td>{Number(v.odometer).toLocaleString()} km</td>
                    <td>{statusBadge(v.status)}</td>
                    <td>{v.assignedDriver?.fullName || "—"}</td>
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
