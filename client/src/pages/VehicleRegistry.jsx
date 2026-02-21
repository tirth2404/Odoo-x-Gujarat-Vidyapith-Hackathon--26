import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import "./VehicleRegistry.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/vehicles`;

const TYPES = ["Truck", "Van", "Mini", "Bike", "Trailer"];
const STATUSES = ["Available", "On Trip", "In Shop", "Retired"];

const emptyForm = {
  licensePlate: "",
  model: "",
  type: "Truck",
  maxCapacity: "",
  capacityUnit: "kg",
  odometer: "",
};

export default function VehicleRegistry() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [topbarControls, setTopbarControls] = useState({
    search: "",
    filterBy: "all",
    sortBy: "default",
    groupBy: "none",
  });

  const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchVehicles = () => {
    setLoading(true);
    const params = {};
    const effectiveSearch = topbarControls.search || search;

    let effectiveType = filterType;
    let effectiveStatus = filterStatus;

    if (topbarControls.filterBy.startsWith("type:")) {
      effectiveType = topbarControls.filterBy.replace("type:", "");
    }
    if (topbarControls.filterBy.startsWith("status:")) {
      effectiveStatus = topbarControls.filterBy.replace("status:", "");
    }

    if (effectiveSearch) params.search = effectiveSearch;
    if (effectiveType) params.type = effectiveType;
    if (effectiveStatus) params.status = effectiveStatus;

    axios
      .get(API, { headers, params })
      .then((res) => setVehicles(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, filterType, filterStatus, topbarControls]);

  useEffect(() => {
    const onTopbarChange = (event) => {
      const detail = event.detail || {};
      if (detail.path !== "/vehicles") return;
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

  const visibleVehicles = useMemo(() => {
    const rows = [...vehicles];

    if (topbarControls.groupBy === "type") {
      rows.sort((a, b) => {
        const group = a.type.localeCompare(b.type);
        return group !== 0 ? group : a.licensePlate.localeCompare(b.licensePlate);
      });
    }

    if (topbarControls.groupBy === "status") {
      rows.sort((a, b) => {
        const group = a.status.localeCompare(b.status);
        return group !== 0 ? group : a.licensePlate.localeCompare(b.licensePlate);
      });
    }

    if (topbarControls.sortBy === "plate_asc") {
      rows.sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
    }
    if (topbarControls.sortBy === "plate_desc") {
      rows.sort((a, b) => b.licensePlate.localeCompare(a.licensePlate));
    }
    if (topbarControls.sortBy === "odometer_asc") {
      rows.sort((a, b) => Number(a.odometer || 0) - Number(b.odometer || 0));
    }
    if (topbarControls.sortBy === "odometer_desc") {
      rows.sort((a, b) => Number(b.odometer || 0) - Number(a.odometer || 0));
    }

    return rows;
  }, [topbarControls.groupBy, topbarControls.sortBy, vehicles]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditingId(v._id);
    setForm({
      licensePlate: v.licensePlate,
      model: v.model,
      type: v.type,
      maxCapacity: v.maxCapacity,
      capacityUnit: v.capacityUnit,
      odometer: v.odometer,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await axios.put(`${API}/${editingId}`, form, { headers });
      } else {
        await axios.post(API, form, { headers });
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await axios.delete(`${API}/${id}`, { headers });
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

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
    <div className="vehicle-registry">
      {/* Header */}
      <div className="vr-header">
        <div>
          <h2 className="vr-title">Vehicle Registry</h2>
          <p className="vr-subtitle">Asset management &amp; tracking</p>
        </div>
        <button className="btn btn--accent" onClick={openNew}>
          + New Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="vr-filters">
        <div className="vr-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="text"
            placeholder="Search plate or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="vr-table-wrapper">
        {loading ? (
          <div className="table-loading">Loading…</div>
        ) : visibleVehicles.length === 0 ? (
          <div className="table-empty">
            No vehicles found. Click <strong>+ New Vehicle</strong> to register one.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>NO</th>
                <th>Plate</th>
                <th>Model</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Odometer</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleVehicles.map((v, i) => (
                <tr key={v._id}>
                  <td>{i + 1}</td>
                  <td className="mono">{v.licensePlate}</td>
                  <td>{v.model}</td>
                  <td>{v.type}</td>
                  <td>
                    {Number(v.maxCapacity).toLocaleString()} {v.capacityUnit}
                  </td>
                  <td>{Number(v.odometer).toLocaleString()} km</td>
                  <td>{statusBadge(v.status)}</td>
                  <td className="action-cell">
                    <button className="btn btn--outline btn--sm" onClick={() => openEdit(v)}>
                      Edit
                    </button>
                    <button className="btn btn--danger btn--sm" onClick={() => handleDelete(v._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {editingId ? "Edit Vehicle" : "Register New Vehicle"}
            </h3>

            {error && <div className="modal-error">{error}</div>}

            <form onSubmit={handleSave} className="modal-form">
              <div className="form-row">
                <label>
                  License Plate
                  <input
                    type="text"
                    required
                    value={form.licensePlate}
                    onChange={(e) =>
                      setForm({ ...form, licensePlate: e.target.value })
                    }
                    placeholder="e.g. B 1234 XYZ"
                  />
                </label>
                <label>
                  Model
                  <input
                    type="text"
                    required
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="e.g. Mitsubishi Colt Diesel"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Type
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Max Payload
                  <div className="input-group">
                    <input
                      type="number"
                      required
                      min="0"
                      value={form.maxCapacity}
                      onChange={(e) =>
                        setForm({ ...form, maxCapacity: e.target.value })
                      }
                      placeholder="e.g. 5000"
                    />
                    <select
                      className="input-addon"
                      value={form.capacityUnit}
                      onChange={(e) =>
                        setForm({ ...form, capacityUnit: e.target.value })
                      }
                    >
                      <option value="kg">kg</option>
                      <option value="ton">ton</option>
                    </select>
                  </div>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Initial Odometer (km)
                  <input
                    type="number"
                    min="0"
                    value={form.odometer}
                    onChange={(e) =>
                      setForm({ ...form, odometer: e.target.value })
                    }
                    placeholder="0"
                  />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn--outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--accent">
                  {editingId ? "Update" : "Save"}
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
