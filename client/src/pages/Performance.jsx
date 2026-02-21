import { useEffect, useState } from "react";
import axios from "axios";
import "./Performance.css";

const API = "http://localhost:5000/api";

const initialEdit = {
  _id: "",
  fullName: "",
  role: "",
  licenseNumber: "",
  licenseCategory: "",
  licenseExpiry: "",
  dutyStatus: "On Duty",
  safetyScore: 100,
  isActive: true,
};

export default function Performance() {
  const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const [summary, setSummary] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editDriver, setEditDriver] = useState(initialEdit);
  const [showEdit, setShowEdit] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/performance/summary`, { headers }),
      axios.get(`${API}/performance/drivers`, { headers }),
    ])
      .then(([summaryRes, driversRes]) => {
        setSummary(summaryRes.data);
        setDrivers(driversRes.data);
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to load performance data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (driver) => {
    setEditDriver({
      _id: driver._id,
      fullName: driver.fullName,
      role: driver.role,
      licenseNumber: driver.licenseNumber || "",
      licenseCategory: driver.licenseCategory || "",
      licenseExpiry: driver.licenseExpiry
        ? new Date(driver.licenseExpiry).toISOString().slice(0, 10)
        : "",
      dutyStatus: driver.dutyStatus || "On Duty",
      safetyScore: driver.safetyScore ?? 100,
      isActive: driver.isActive,
    });
    setShowEdit(true);
    setError("");
  };

  const saveDriver = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.put(`${API}/performance/drivers/${editDriver._id}`, editDriver, {
        headers,
      });
      setShowEdit(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update driver");
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const text = `${driver.fullName} ${driver.email} ${driver.role}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const complianceBadge = (driver) => {
    if (driver.isLicenseExpired) {
      return <span className="badge p-badge--expired">Expired</span>;
    }
    if (!driver.licenseExpiry) {
      return <span className="badge p-badge--missing">No Expiry</span>;
    }
    return <span className="badge p-badge--ok">Valid</span>;
  };

  return (
    <div className="performance-page">
      <div className="pf-header">
        <div>
          <h2 className="pf-title">Driver Performance & Safety</h2>
          <p className="pf-subtitle">Compliance, duty status and safety score monitoring</p>
        </div>
      </div>

      {error && <div className="pf-error">{error}</div>}

      <div className="pf-kpis">
        <div className="pf-kpi-card">
          <span className="kpi-label">Total Drivers</span>
          <span className="kpi-value">{summary?.totalDrivers || 0}</span>
        </div>
        <div className="pf-kpi-card">
          <span className="kpi-label">On Duty</span>
          <span className="kpi-value">{summary?.onDuty || 0}</span>
        </div>
        <div className="pf-kpi-card">
          <span className="kpi-label">Suspended</span>
          <span className="kpi-value">{summary?.suspended || 0}</span>
        </div>
        <div className="pf-kpi-card">
          <span className="kpi-label">Expired Licenses</span>
          <span className="kpi-value">{summary?.expiredLicenses || 0}</span>
        </div>
        <div className="pf-kpi-card pf-kpi-card--accent">
          <span className="kpi-label">Avg Safety Score</span>
          <span className="kpi-value">{summary?.avgSafetyScore || 0}</span>
        </div>
      </div>

      <div className="pf-controls">
        <div className="pf-search">
          <input
            type="text"
            placeholder="Search by name, role or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="pf-table-wrapper">
        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : filteredDrivers.length === 0 ? (
          <div className="table-empty">No drivers found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Duty</th>
                <th>Compliance</th>
                <th>Safety</th>
                <th>Completion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver._id}>
                  <td>
                    {driver.fullName}
                    <br />
                    <small className="text-muted">{driver.email}</small>
                  </td>
                  <td>{driver.role}</td>
                  <td>{driver.dutyStatus}</td>
                  <td>{complianceBadge(driver)}</td>
                  <td>{driver.safetyScore}</td>
                  <td>{driver.completionRate}%</td>
                  <td>
                    <button className="btn btn--outline btn--sm" onClick={() => openEdit(driver)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Update Driver Compliance</h3>
            <form className="modal-form" onSubmit={saveDriver}>
              <label>
                Driver
                <input type="text" value={`${editDriver.fullName} (${editDriver.role})`} disabled />
              </label>

              <div className="form-row">
                <label>
                  License Number
                  <input
                    type="text"
                    value={editDriver.licenseNumber}
                    onChange={(e) => setEditDriver({ ...editDriver, licenseNumber: e.target.value })}
                  />
                </label>
                <label>
                  License Category
                  <select
                    value={editDriver.licenseCategory}
                    onChange={(e) => setEditDriver({ ...editDriver, licenseCategory: e.target.value })}
                  >
                    <option value="">— none —</option>
                    <option value="Any">Any</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Mini">Mini</option>
                    <option value="Bike">Bike</option>
                    <option value="Trailer">Trailer</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  License Expiry
                  <input
                    type="date"
                    value={editDriver.licenseExpiry}
                    onChange={(e) => setEditDriver({ ...editDriver, licenseExpiry: e.target.value })}
                  />
                </label>
                <label>
                  Duty Status
                  <select
                    value={editDriver.dutyStatus}
                    onChange={(e) => setEditDriver({ ...editDriver, dutyStatus: e.target.value })}
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Safety Score (0-100)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editDriver.safetyScore}
                    onChange={(e) => setEditDriver({ ...editDriver, safetyScore: e.target.value })}
                  />
                </label>
                <label>
                  Account Active
                  <select
                    value={String(editDriver.isActive)}
                    onChange={(e) =>
                      setEditDriver({ ...editDriver, isActive: e.target.value === "true" })
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--outline" onClick={() => setShowEdit(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--accent">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
