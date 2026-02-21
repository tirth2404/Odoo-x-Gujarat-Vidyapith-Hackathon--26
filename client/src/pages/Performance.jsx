import { useEffect, useState } from "react";
import axios from "axios";
import "./Performance.css";

const API = "http://localhost:5000/api";
const DUTY_OPTS = ["On Duty", "Off Duty", "On Break", "Suspended"];

export default function Performance() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    licenseNumber: "",
    licenseExpiry: "",
    safetyScore: 100,
    complaints: 0,
    dutyStatus: "On Duty",
  });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDrivers = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;

    axios
      .get(`${API}/drivers`, { headers, params })
      .then((res) => setDrivers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrivers();
  }, [search]);

  const openNew = () => {
    setForm({
      fullName: "",
      email: "",
      licenseNumber: "",
      licenseExpiry: "",
      safetyScore: 100,
      complaints: 0,
      dutyStatus: "On Duty",
    });
    setError("");
    setShowModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API}/drivers`, form, { headers });
      setShowModal(false);
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const updateDuty = async (id, dutyStatus) => {
    try {
      await axios.put(`${API}/drivers/${id}`, { dutyStatus }, { headers });
      fetchDrivers();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProfile = async (id) => {
    if (!window.confirm("Delete this driver profile?")) return;
    try {
      await axios.delete(`${API}/drivers/${id}`, { headers });
      fetchDrivers();
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const dutyBadge = (status) => {
    const map = {
      "On Duty": "dbadge--onduty",
      "Off Duty": "dbadge--offduty",
      "On Break": "dbadge--break",
      Suspended: "dbadge--suspended",
    };
    return <span className={`badge ${map[status] || ""}`}>{status}</span>;
  };

  return (
    <div className="performance-page">
      {/* Header */}
      <div className="pf-header">
        <div>
          <h2 className="pf-title">Driver Performance &amp; Safety Profiles</h2>
          <p className="pf-subtitle">License tracking, safety scores &amp; duty status</p>
        </div>
        <button className="btn btn--accent" onClick={openNew}>
          + Add Driver Profile
        </button>
      </div>

      {/* Filters */}
      <div className="pf-filters">
        <div className="pf-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search driver name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="pf-table-wrapper">
        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : drivers.length === 0 ? (
          <div className="table-empty">No driver profiles found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>License #</th>
                <th>Expiry</th>
                <th>Completion Rate</th>
                <th>Safety Score</th>
                <th>Complaints</th>
                <th>Duty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d._id} className={d.licenseExpired ? "row--expired" : ""}>
                  <td>
                    {d.user?.fullName || "—"}
                    {d.licenseExpired && (
                      <span className="expired-tag">LICENSE EXPIRED</span>
                    )}
                  </td>
                  <td className="mono">{d.licenseNumber}</td>
                  <td className={d.licenseExpired ? "text-danger" : ""}>
                    {formatDate(d.licenseExpiry)}
                  </td>
                  <td>{d.completionRate}%</td>
                  <td>
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{
                          width: `${d.safetyScore}%`,
                          background:
                            d.safetyScore >= 80
                              ? "#10b981"
                              : d.safetyScore >= 50
                                ? "#f59e0b"
                                : "#ef4444",
                        }}
                      />
                      <span className="score-text">{d.safetyScore}%</span>
                    </div>
                  </td>
                  <td>{d.complaints}</td>
                  <td>{dutyBadge(d.dutyStatus)}</td>
                  <td className="action-cell">
                    <select
                      className="duty-select"
                      value={d.dutyStatus}
                      onChange={(e) => updateDuty(d._id, e.target.value)}
                    >
                      {DUTY_OPTS.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <button className="btn btn--danger btn--sm" onClick={() => deleteProfile(d._id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Driver Profile Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="modal-title">Add Driver Profile</h3>
            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleCreate} className="modal-form">
              <label>
                Driver Name
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Enter driver's full name"
                />
              </label>

              <label>
                Email (optional)
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter driver's email or leave blank"
                />
              </label>

              <div className="form-row">
                <label>
                  License Number
                  <input
                    type="text"
                    required
                    value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    placeholder="e.g. 23223"
                  />
                </label>
                <label>
                  License Expiry
                  <input
                    type="date"
                    required
                    value={form.licenseExpiry}
                    onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Safety Score (0–100)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.safetyScore}
                    onChange={(e) => setForm({ ...form, safetyScore: e.target.value })}
                  />
                </label>
                <label>
                  Complaints
                  <input
                    type="number"
                    min="0"
                    value={form.complaints}
                    onChange={(e) => setForm({ ...form, complaints: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Duty Status
                <select
                  value={form.dutyStatus}
                  onChange={(e) => setForm({ ...form, dutyStatus: e.target.value })}
                >
                  {DUTY_OPTS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>

              <div className="modal-actions">
                <button type="button" className="btn btn--outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--accent">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
