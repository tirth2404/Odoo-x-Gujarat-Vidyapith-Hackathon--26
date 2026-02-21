import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./TripDispatcher.css";

const API = "http://localhost:5000/api";
const STATUSES = ["Pending", "On Way", "Delivered", "Cancelled"];

const emptyForm = {
  vehicle: "",
  driver: "",
  cargoWeight: "",
  origin: "",
  destination: "",
  estimatedFuelCost: "",
};

export default function TripDispatcher() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
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

  /* ── Fetch helpers ── */
  const fetchTrips = () => {
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
      .get(`${API}/trips`, { headers, params })
      .then((res) => setTrips(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchAvailable = () => {
    // Only "Available" vehicles can be dispatched
    axios
      .get(`${API}/vehicles?status=Available`, { headers })
      .then((res) => setVehicles(res.data))
      .catch(console.error);

    // Load users for driver assignment dropdown
    axios
      .get(`${API}/auth/users?assignable=true`, { headers })
      .then((res) => setDrivers(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchTrips();
  }, [search, filterStatus, topbarControls]);

  useEffect(() => {
    const onTopbarChange = (event) => {
      const detail = event.detail || {};
      if (detail.path !== "/trips") return;
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

  const visibleTrips = useMemo(() => {
    const rows = [...trips];

    if (topbarControls.groupBy === "status") {
      rows.sort((a, b) => {
        const group = (a.status || "").localeCompare(b.status || "");
        return group !== 0 ? group : (a.origin || "").localeCompare(b.origin || "");
      });
    }

    if (topbarControls.groupBy === "vehicleType") {
      rows.sort((a, b) => {
        const group = (a.vehicle?.type || "").localeCompare(b.vehicle?.type || "");
        return group !== 0 ? group : (a.vehicle?.licensePlate || "").localeCompare(b.vehicle?.licensePlate || "");
      });
    }

    if (topbarControls.sortBy === "date_desc") {
      rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (topbarControls.sortBy === "cargo_desc") {
      rows.sort((a, b) => Number(b.cargoWeight || 0) - Number(a.cargoWeight || 0));
    }
    if (topbarControls.sortBy === "fuel_desc") {
      rows.sort((a, b) => Number(b.estimatedFuelCost || 0) - Number(a.estimatedFuelCost || 0));
    }

    return rows;
  }, [topbarControls.groupBy, topbarControls.sortBy, trips]);

  useEffect(() => {
    fetchAvailable();
  }, []);

  /* ── Form handlers ── */
  const openForm = () => {
    setForm(emptyForm);
    setError("");
    setShowForm(true);
    fetchAvailable(); // refresh available vehicles
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post(`${API}/trips`, form, { headers });
      setShowForm(false);
      fetchTrips();
      fetchAvailable();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API}/trips/${id}/status`, { status: newStatus }, { headers });
      fetchTrips();
      fetchAvailable();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTrip = async (id) => {
    if (!window.confirm("Delete this trip?")) return;
    try {
      await axios.delete(`${API}/trips/${id}`, { headers });
      fetchTrips();
      fetchAvailable();
    } catch (err) {
      console.error(err);
    }
  };

  const statusBadge = (status) => {
    const map = {
      Pending: "badge--pending",
      "On Way": "badge--onway",
      Delivered: "badge--delivered",
      Cancelled: "badge--cancelled",
    };
    return <span className={`badge ${map[status] || ""}`}>{status}</span>;
  };

  const nextStatus = (current) => {
    if (current === "Pending") return "On Way";
    if (current === "On Way") return "Delivered";
    return null;
  };

  /* ── Selected vehicle capacity hint ── */
  const selectedVehicle = vehicles.find((v) => v._id === form.vehicle);
  const capacityHint = selectedVehicle
    ? `Max: ${selectedVehicle.maxCapacity} ${selectedVehicle.capacityUnit}`
    : "";

  return (
    <div className="trip-dispatcher">
      {/* Header */}
      <div className="td-header">
        <div>
          <h2 className="td-title">Trip Dispatcher</h2>
          <p className="td-subtitle">Dispatch &amp; track deliveries</p>
        </div>
        <button className="btn btn--primary" onClick={openForm}>
          + New Trip
        </button>
      </div>

      {/* Filters */}
      <div className="td-filters">
        <div className="td-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Search origin / destination…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Trip table */}
      <div className="td-table-wrapper">
        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : visibleTrips.length === 0 ? (
          <div className="table-empty">No trips found. Click <strong>+ New Trip</strong> to dispatch one.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fleet Type</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Cargo</th>
                <th>Fuel Est.</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTrips.map((t, i) => (
                <tr key={t._id}>
                  <td>{i + 1}</td>
                  <td>
                    <span className="mono">{t.vehicle?.licensePlate}</span>
                    <br />
                    <small className="text-muted">{t.vehicle?.type} — {t.vehicle?.model}</small>
                  </td>
                  <td>{t.origin}</td>
                  <td>{t.destination}</td>
                  <td>{Number(t.cargoWeight).toLocaleString()} kg</td>
                  <td>₹{Number(t.estimatedFuelCost).toLocaleString()}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td className="action-cell">
                    {nextStatus(t.status) && (
                      <button
                        className="btn btn--accent btn--sm"
                        onClick={() => updateStatus(t._id, nextStatus(t.status))}
                      >
                        → {nextStatus(t.status)}
                      </button>
                    )}
                    {t.status === "Pending" && (
                      <button
                        className="btn btn--outline btn--sm"
                        onClick={() => updateStatus(t._id, "Cancelled")}
                      >
                        Cancel
                      </button>
                    )}
                    <button className="btn btn--danger btn--sm" onClick={() => deleteTrip(t._id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Trip Form (inline panel) */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">New Trip Form</h3>
            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <label>
                  Select Vehicle
                  <select
                    required
                    value={form.vehicle}
                    onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  >
                    <option value="">— pick an available vehicle —</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.licensePlate} — {v.type} {v.model} ({v.maxCapacity} {v.capacityUnit})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Cargo Weight (Kg)
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.cargoWeight}
                    onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })}
                    placeholder={capacityHint || "e.g. 500"}
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Select Driver
                  <select
                    required
                    value={form.driver}
                    onChange={(e) => setForm({ ...form, driver: e.target.value })}
                  >
                    <option value="">— pick a driver —</option>
                    {drivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.fullName} ({d.role})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Origin Address
                  <input
                    type="text"
                    required
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    placeholder="e.g. Mumbai"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Destination
                  <input
                    type="text"
                    required
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    placeholder="e.g. Pune"
                  />
                </label>

                <label>
                  Estimated Fuel Cost (₹)
                  <input
                    type="number"
                    min="0"
                    value={form.estimatedFuelCost}
                    onChange={(e) => setForm({ ...form, estimatedFuelCost: e.target.value })}
                    placeholder="e.g. 3500"
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--outline" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--accent">
                  Confirm &amp; Dispatch Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
