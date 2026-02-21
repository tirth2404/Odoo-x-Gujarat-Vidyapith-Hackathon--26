import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import "./Expenses.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const EXP_STATUSES = ["Pending", "Approved", "Done"];

const emptyForm = {
  trip: "",
  driver: "",
  distance: "",
  fuelCost: "",
  miscExpense: "",
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
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

  const fetchExpenses = () => {
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
      .get(`${API}/expenses`, { headers, params })
      .then((res) => setExpenses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchTrips = () => {
    axios
      .get(`${API}/trips`, { headers })
      .then((res) => setTrips(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchExpenses();
  }, [search, filterStatus, topbarControls]);

  useEffect(() => {
    const onTopbarChange = (event) => {
      const detail = event.detail || {};
      if (detail.path !== "/expenses") return;
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

  const visibleExpenses = useMemo(() => {
    const rows = [...expenses];

    if (topbarControls.groupBy === "status") {
      rows.sort((a, b) => {
        const group = (a.status || "").localeCompare(b.status || "");
        return group !== 0 ? group : (a.driver?.fullName || "").localeCompare(b.driver?.fullName || "");
      });
    }

    if (topbarControls.sortBy === "fuel_desc") {
      rows.sort((a, b) => Number(b.fuelCost || 0) - Number(a.fuelCost || 0));
    }
    if (topbarControls.sortBy === "total_desc") {
      rows.sort(
        (a, b) =>
          Number((b.fuelCost || 0) + (b.miscExpense || 0)) - Number((a.fuelCost || 0) + (a.miscExpense || 0))
      );
    }
    if (topbarControls.sortBy === "distance_desc") {
      rows.sort((a, b) => Number(b.distance || 0) - Number(a.distance || 0));
    }

    return rows;
  }, [expenses, topbarControls.groupBy, topbarControls.sortBy]);

  useEffect(() => {
    fetchTrips();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setError("");
    setShowModal(true);
    fetchTrips();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      // Auto-fill driver from the selected trip
      const selectedTrip = trips.find((t) => t._id === form.trip);
      const payload = {
        ...form,
        driver: selectedTrip?.driver?._id || form.driver,
      };
      await axios.post(`${API}/expenses`, payload, { headers });
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API}/expenses/${id}`, { status: newStatus }, { headers });
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await axios.delete(`${API}/expenses/${id}`, { headers });
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const statusBadge = (status) => {
    const map = {
      Pending: "ebadge--pending",
      Approved: "ebadge--approved",
      Done: "ebadge--done",
    };
    return <span className={`badge ${map[status] || ""}`}>{status}</span>;
  };

  // Compute totals
  const totalFuel = expenses.reduce((s, e) => s + (e.fuelCost || 0), 0);
  const totalMisc = expenses.reduce((s, e) => s + (e.miscExpense || 0), 0);
  const totalDist = expenses.reduce((s, e) => s + (e.distance || 0), 0);

  return (
    <div className="expenses-page">
      {/* Header */}
      <div className="ex-header">
        <div>
          <h2 className="ex-title">Expense &amp; Fuel Logging</h2>
          <p className="ex-subtitle">Track fuel costs and miscellaneous expenses per trip</p>
        </div>
        <button className="btn btn--accent" onClick={openNew}>
          Add an Expense
        </button>
      </div>

      {/* Summary cards */}
      <div className="ex-summary">
        <div className="ex-card">
          <span className="ex-card-val">₹{totalFuel.toLocaleString()}</span>
          <span className="ex-card-lbl">Total Fuel Cost</span>
        </div>
        <div className="ex-card">
          <span className="ex-card-val">₹{totalMisc.toLocaleString()}</span>
          <span className="ex-card-lbl">Total Misc Expense</span>
        </div>
        <div className="ex-card">
          <span className="ex-card-val">{totalDist.toLocaleString()} km</span>
          <span className="ex-card-lbl">Total Distance</span>
        </div>
        <div className="ex-card">
          <span className="ex-card-val">₹{(totalFuel + totalMisc).toLocaleString()}</span>
          <span className="ex-card-lbl">Grand Total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="ex-filters">
        <div className="ex-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search driver / plate…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {EXP_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="ex-table-wrapper">
        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : visibleExpenses.length === 0 ? (
          <div className="table-empty">No expenses logged yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Driver</th>
                <th>Distance</th>
                <th>Fuel Expense</th>
                <th>Misc. Expen</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleExpenses.map((e) => (
                <tr key={e._id}>
                  <td className="mono">{e.trip?._id?.slice(-6).toUpperCase() || "—"}</td>
                  <td>{e.driver?.fullName || "—"}</td>
                  <td>{Number(e.distance).toLocaleString()} km</td>
                  <td>₹{Number(e.fuelCost).toLocaleString()}</td>
                  <td>₹{Number(e.miscExpense).toLocaleString()}</td>
                  <td>{statusBadge(e.status)}</td>
                  <td className="action-cell">
                    {e.status === "Pending" && (
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => updateStatus(e._id, "Approved")}
                      >
                        Approve
                      </button>
                    )}
                    {e.status === "Approved" && (
                      <button
                        className="btn btn--accent btn--sm"
                        onClick={() => updateStatus(e._id, "Done")}
                      >
                        Done
                      </button>
                    )}
                    <button className="btn btn--danger btn--sm" onClick={() => deleteExpense(e._id)}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Expense Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="modal-title">New Expense</h3>
            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleCreate} className="modal-form">
              <label>
                Trip ID
                <select
                  required
                  value={form.trip}
                  onChange={(e) => {
                    const t = trips.find((tr) => tr._id === e.target.value);
                    setForm({
                      ...form,
                      trip: e.target.value,
                      driver: t?.driver?._id || "",
                    });
                  }}
                >
                  <option value="">— select trip —</option>
                  {trips.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t._id.slice(-6).toUpperCase()} — {t.origin} → {t.destination} ({t.vehicle?.licensePlate})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Driver
                <input
                  type="text"
                  readOnly
                  value={
                    trips.find((t) => t._id === form.trip)?.driver?.fullName ||
                    form.driver
                  }
                  placeholder="Auto-filled from trip"
                />
              </label>

              <div className="form-row">
                <label>
                  Fuel Cost (₹)
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.fuelCost}
                    onChange={(e) => setForm({ ...form, fuelCost: e.target.value })}
                    placeholder="e.g. 19000"
                  />
                </label>
                <label>
                  Misc Expense (₹)
                  <input
                    type="number"
                    min="0"
                    value={form.miscExpense}
                    onChange={(e) => setForm({ ...form, miscExpense: e.target.value })}
                    placeholder="e.g. 3000"
                  />
                </label>
              </div>

              <label>
                Distance (km)
                <input
                  type="number"
                  min="0"
                  value={form.distance}
                  onChange={(e) => setForm({ ...form, distance: e.target.value })}
                  placeholder="e.g. 1000"
                />
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
        </div>,
        document.body
      )}
    </div>
  );
}
