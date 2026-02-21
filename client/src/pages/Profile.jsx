import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

const API = "http://localhost:5000/api/auth";

const LICENSE_CATEGORIES = ["", "Truck", "Van", "Mini", "Bike", "Trailer", "Any"];
const DUTY_STATUSES = ["On Duty", "Off Duty", "Suspended"];

const ROLE_LABELS = {
  admin: "Admin",
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
  driver: "Driver",
};

// Roles that see driver-specific fields (license, safety score, duty status)
const DRIVER_ROLES = ["driver", "fleet_manager", "safety_officer"];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    department: "",
    licenseNumber: "",
    licenseCategory: "",
    licenseExpiry: "",
    dutyStatus: "On Duty",
    safetyScore: 100,
  });

  const token = user?.token;
  const userId = user?._id;
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Load avatar from localStorage
  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`fleetflow_avatar_${userId}`);
    if (stored) setAvatarUrl(stored);
  }, [userId]);

  const fillForm = (profile) => {
    setForm({
      fullName: profile.fullName || "",
      phone: profile.phone || "",
      department: profile.department || "",
      licenseNumber: profile.licenseNumber || "",
      licenseCategory: profile.licenseCategory || "",
      licenseExpiry: profile.licenseExpiry
        ? new Date(profile.licenseExpiry).toISOString().slice(0, 10)
        : "",
      dutyStatus: profile.dutyStatus || "On Duty",
      safetyScore: Number(profile.safetyScore ?? 100),
    });
  };

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API}/me`, { headers });

      // For admin (static user), merge with any saved overrides from localStorage
      let profile = data;
      if (user?.role === "admin") {
        const saved = localStorage.getItem("fleetflow_admin_profile");
        if (saved) {
          try {
            const overrides = JSON.parse(saved);
            profile = { ...data, ...overrides };
          } catch (_) { /* ignore parse errors */ }
        }
      }

      fillForm(profile);
      updateUser({
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadProfile();
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        department: form.department.trim(),
        licenseNumber: form.licenseNumber.trim(),
        licenseCategory: form.licenseCategory,
        licenseExpiry: form.licenseExpiry || null,
        dutyStatus: form.dutyStatus,
        safetyScore: Number(form.safetyScore || 0),
      };

      const { data } = await axios.put(`${API}/me`, payload, { headers });

      // For admin, also save to localStorage so changes persist across login
      if (user?.role === "admin") {
        localStorage.setItem("fleetflow_admin_profile", JSON.stringify(payload));
      }

      // Merge admin overrides for display
      const profile = user?.role === "admin" ? { ...data, ...payload } : data;
      fillForm(profile);
      updateUser({
        fullName: profile.fullName,
        email: profile.email,
        role: profile.role,
      });
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials =
    form.fullName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const safeScore = Math.max(0, Math.min(100, Number(form.safetyScore) || 0));
  const isDriverRole = DRIVER_ROLES.includes(user?.role);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatarUrl(dataUrl);
      if (userId) {
        localStorage.setItem(`fleetflow_avatar_${userId}`, dataUrl);
        window.dispatchEvent(new Event("fleetflow-avatar-change"));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="profile-page">
      <div className="profile-head">
        <h2 className="profile-title">My Profile</h2>
        <p className="profile-subtitle">View and update your account details</p>
      </div>

      {!loading && (
        <div className="profile-hero">
          <label className="profile-avatar-wrap" title="Click to change avatar">
            <input
              type="file"
              accept="image/*"
              className="profile-avatar-input"
              onChange={handleAvatarChange}
            />
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar">{initials}</div>
            )}
            <div className="profile-avatar-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </div>
          </label>
          <div className="profile-hero-info">
            <div className="profile-hero-name">{form.fullName || "User"}</div>
            <div className="profile-hero-email">{user?.email || "No email"}</div>
            <div className="profile-hero-row">
              <span className="profile-pill">{ROLE_LABELS[user?.role] || user?.role || "User"}</span>
              {isDriverRole && <span className="profile-pill">{form.dutyStatus || "On Duty"}</span>}
            </div>
          </div>
          {isDriverRole && (
            <div className="profile-score">
              <div className="profile-score-label">Safety Score</div>
              <div className="profile-score-track">
                <div className="profile-score-fill" style={{ width: `${safeScore}%` }} />
              </div>
              <div className="profile-score-value">{safeScore}%</div>
            </div>
          )}
        </div>
      )}

      {error && <div className="profile-alert profile-alert--error">{error}</div>}
      {success && <div className="profile-alert profile-alert--success">{success}</div>}

      {loading ? (
        <div className="profile-loading">Loading profile...</div>
      ) : (
        <form className="profile-card" onSubmit={handleSubmit}>
          <div className="profile-section">
            <h3 className="profile-section-title">Basic Information</h3>
            <div className="profile-row">
              <label>
                Full Name
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Email
                <input type="email" value={user?.email || ""} disabled />
              </label>
            </div>

            <div className="profile-row">
              <label>
                Role
                <input type="text" value={ROLE_LABELS[user?.role] || user?.role || "User"} disabled />
              </label>
              <label>
                Phone
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone"
                />
              </label>
            </div>

            <div className="profile-row">
              <label>
                Department
                <input
                  type="text"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  placeholder="Enter department"
                />
              </label>
              {isDriverRole && (
                <label>
                  Duty Status
                  <select name="dutyStatus" value={form.dutyStatus} onChange={handleChange}>
                    {DUTY_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          {isDriverRole && (
            <div className="profile-section">
              <h3 className="profile-section-title">Safety & License</h3>
              <div className="profile-row">
                <label>
                  License Number
                  <input
                    type="text"
                    name="licenseNumber"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    placeholder="Enter license number"
                  />
                </label>
                <label>
                  License Category
                  <select
                    name="licenseCategory"
                    value={form.licenseCategory}
                    onChange={handleChange}
                  >
                    {LICENSE_CATEGORIES.map((category) => (
                      <option key={category || "none"} value={category}>
                        {category || "Not set"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="profile-row">
                <label>
                  License Expiry
                  <input
                    type="date"
                    name="licenseExpiry"
                    value={form.licenseExpiry}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  Safety Score
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="safetyScore"
                    value={form.safetyScore}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </div>
          )}

          <div className="profile-actions">
            <button type="submit" className="btn btn--accent" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
