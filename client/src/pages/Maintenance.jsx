import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./Maintenance.css";

const API = "http://localhost:5000/api";
const LOG_STATUSES = ["New", "In Progress", "Completed"];

const emptyForm = {
  vehicle: "",
  issue: "",
  date: new Date().toISOString().slice(0, 10),
  cost: "",
};

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [topbarControls, setTopbarControls] = useState({
    search: "",
    filterBy: "all",
    sortBy: "default",
    groupBy: "none",
  });
  const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchLogs = () => {
    setLoading(true);
    const params = {};
    const effectiveSearch = topbarControls.search || search;
    let effectiveStatus = filterStatus;

    if (topbarControls.filterBy.startsWith("status:")) {
      effectiveStatus = topbarControls.filterBy.replace("status:", "");
    }

    if (effectiveSearch) params.search = effectiveSearch;
    if (effectiveStatus) params.status = effectiveStatus;

    axios
      .get(`${API}/maintenance`, { headers, params })
      .then((res) => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchVehicles = () => {
    // All vehicles (not just Available) - user might want to log a repair for any
    axios
      .get(`${API}/vehicles`, { headers })
      .then((res) => setVehicles(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchLogs();
  }, [search, filterStatus, topbarControls]);

  useEffect(() => {
    const onTopbarChange = (event) => {
      const detail = event.detail || {};
      if (detail.path !== "/maintenance") return;
      setTopbarControls({
        search: detail.search || "",
        filterBy: detail.filterBy || "all",
        sortBy: detail.sortBy || "default",
        groupBy: detail.groupBy || "none",
      });
    };

    window.addEventListener("fleetflow-table-controls", onTopbarChange);
    return () => window.removeEventListener("fleetflow-table-controls", onTopbarChange);
  }, []);

  const visibleMaintenance = useMemo(() => {
    const rows = [...logs];

    if (topbarControls.groupBy === "status") {
      rows.sort((a, b) => {
        const group = (a.status || "").localeCompare(b.status || "");
        return group !== 0 ? group : (a.vehicle?.licensePlate || "").localeCompare(b.vehicle?.licensePlate || "");
      });
    }

    if (topbarControls.groupBy === "type") {
      rows.sort((a, b) => {
        const group = (a.type || "").localeCompare(b.type || "");
        return group !== 0 ? group : (a.vehicle?.licensePlate || "").localeCompare(b.vehicle?.licensePlate || "");
      });
    }

    if (topbarControls.sortBy === "date_desc") {
      rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }
    if (topbarControls.sortBy === "cost_desc") {
      rows.sort((a, b) => Number(b.cost || 0) - Number(a.cost || 0));
    }

    return rows;
  }, [logs, topbarControls.groupBy, topbarControls.sortBy]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setError("");
    setShowModal(true);
    fetchVehicles();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API}/maintenance`, form, { headers });
      setShowModal(false);
      fetchLogs();
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API}/maintenance/${id}`, { status: newStatus }, { headers });
      fetchLogs();
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLog = async (id) => {
    if (!window.confirm("Delete this maintenance log?")) return;
    try {
      await axios.delete(`${API}/maintenance/${id}`, { headers });
      fetchLogs();
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const statusBadge = (status) => {
    const map = {
      New: "mbadge--new",
      "In Progress": "mbadge--inprogress",
      Completed: "mbadge--completed",
    };
    return <span className={`badge ${map[status] || ""}`}>{status}</span>;
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div className="maintenance-page">
      {/* Header */}
      <div className="mt-header">
        <div>
          <h2 className="mt-title">Maintenance &amp; Service Logs</h2>
          <p className="mt-subtitle">Track repairs and keep your fleet healthy</p>
        </div>
        <button className="btn btn--accent" onClick={openNew}>
          Create New Service
        </button>
      </div>

      {/* Filters */}
      <div className="mt-filters">
        <div className="mt-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search issue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {LOG_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="mt-table-wrapper">
        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : visibleMaintenance.length === 0 ? (
          <div className="table-empty">No maintenance logs yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Log ID</th>
                <th>Vehicle</th>
                <th>Issue / Service</th>
                <th>Date</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleMaintenance.map((l, i) => (
                <tr key={l._id}>
                  <td className="mono">{String(i + 1).padStart(3, "0")}</td>
                  <td>
                    {l.vehicle?.licensePlate || "—"}
                    <br />
                    <small className="text-muted">{l.vehicle?.model}</small>
                  </td>
                  <td>{l.issue}</td>
                  <td>{formatDate(l.date)}</td>
                  <td>₹{Number(l.cost).toLocaleString()}</td>
                  <td>{statusBadge(l.status)}</td>
                  <td className="action-cell">
                    {l.status === "New" && (
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => updateStatus(l._id, "In Progress")}
                      >
                        Start
                      </button>
                    )}
                    {l.status === "In Progress" && (
                      <button
                        className="btn btn--accent btn--sm"
                        onClick={() => updateStatus(l._id, "Completed")}
                      >
                        Complete
                      </button>
                    )}
                    <button className="btn btn--danger btn--sm" onClick={() => deleteLog(l._id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Service Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">New Service</h3>
            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleCreate} className="modal-form">
              <label>
                Vehicle Name
                <select
                  required
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                >
                  <option value="">— select vehicle —</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.licensePlate} — {v.model}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Issue / Service
                <input
                  type="text"
                  required
                  value={form.issue}
                  onChange={(e) => setForm({ ...form, issue: e.target.value })}
                  placeholder="e.g. Engine Issue, Oil Change"
                />
              </label>

              <div className="form-row">
                <label>
                  Date
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label>
                  Cost (₹)
                  <input
                    type="number"
                    min="0"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="e.g. 10000"
                  />
                </label>
              </div>

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
