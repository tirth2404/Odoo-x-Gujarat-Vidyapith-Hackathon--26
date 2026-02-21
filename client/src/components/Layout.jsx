import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "grid",
    category: "Operations",
    roles: ["fleet_manager", "dispatcher", "safety_officer", "financial_analyst"],
  },
  {
    path: "/vehicles",
    label: "Vehicle Registry",
    icon: "truck",
    category: "Operations",
    roles: ["fleet_manager"],
  },
  {
    path: "/trips",
    label: "Trip Dispatcher",
    icon: "navigation",
    category: "Operations",
    roles: ["fleet_manager", "dispatcher"],
  },
  {
    path: "/maintenance",
    label: "Maintenance",
    icon: "tool",
    category: "Operations",
    roles: ["fleet_manager", "safety_officer"],
  },
  {
    path: "/expenses",
    label: "Trip & Expense",
    icon: "dollar-sign",
    category: "Finance",
    roles: ["fleet_manager", "financial_analyst"],
  },
  {
    path: "/performance",
    label: "Performance",
    icon: "bar-chart-2",
    category: "Safety",
    roles: ["fleet_manager", "safety_officer"],
  },
  {
    path: "/analytics",
    label: "Analytics",
    icon: "pie-chart",
    roles: ["fleet_manager", "financial_analyst"],
  },
];

/* Simple SVG icons keyed by feather-icon name */
const icons = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  ),
  navigation: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
  ),
  tool: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
  ),
  "dollar-sign": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  ),
  "bar-chart-2": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  "pie-chart": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
  ),
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [topSearch, setTopSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupBy, setGroupBy] = useState("none");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  const roleScopedItems = useMemo(() => {
    if (user?.role === "admin") return navItems;
    return navItems.filter((item) => item.roles.includes(user?.role));
  }, [user?.role]);

  const visibleNavItems = roleScopedItems;

  const routeControlConfig = useMemo(
    () => ({
      "/dashboard": {
        searchPlaceholder: "Search fleet...",
        groupOptions: [
          { value: "none", label: "Group by" },
          { value: "status", label: "Status" },
        ],
        filterOptions: [
          { value: "all", label: "Filter" },
          { value: "status:Available", label: "Available" },
          { value: "status:On Trip", label: "On Trip" },
          { value: "status:In Shop", label: "In Shop" },
          { value: "status:Retired", label: "Retired" },
        ],
        sortOptions: [
          { value: "default", label: "Sort by..." },
          { value: "plate_asc", label: "Plate A-Z" },
          { value: "plate_desc", label: "Plate Z-A" },
        ],
      },
      "/vehicles": {
        searchPlaceholder: "Search vehicle...",
        groupOptions: [
          { value: "none", label: "Group by" },
          { value: "type", label: "Type" },
          { value: "status", label: "Status" },
        ],
        filterOptions: [
          { value: "all", label: "Filter" },
          { value: "status:Available", label: "Status: Available" },
          { value: "status:On Trip", label: "Status: On Trip" },
          { value: "status:In Shop", label: "Status: In Shop" },
          { value: "status:Retired", label: "Status: Retired" },
          { value: "type:Truck", label: "Type: Truck" },
          { value: "type:Van", label: "Type: Van" },
          { value: "type:Mini", label: "Type: Mini" },
          { value: "type:Bike", label: "Type: Bike" },
          { value: "type:Trailer", label: "Type: Trailer" },
        ],
        sortOptions: [
          { value: "default", label: "Sort by..." },
          { value: "plate_asc", label: "Plate A-Z" },
          { value: "plate_desc", label: "Plate Z-A" },
          { value: "odometer_asc", label: "Odometer Low-High" },
          { value: "odometer_desc", label: "Odometer High-Low" },
        ],
      },
      "/trips": {
        searchPlaceholder: "Search trip...",
        groupOptions: [
          { value: "none", label: "Group by" },
          { value: "status", label: "Status" },
          { value: "vehicleType", label: "Vehicle Type" },
        ],
        filterOptions: [
          { value: "all", label: "Filter" },
          { value: "status:Pending", label: "Status: Pending" },
          { value: "status:On Way", label: "Status: On Way" },
          { value: "status:Delivered", label: "Status: Delivered" },
          { value: "status:Cancelled", label: "Status: Cancelled" },
        ],
        sortOptions: [
          { value: "default", label: "Sort by..." },
          { value: "date_desc", label: "Newest First" },
          { value: "cargo_desc", label: "Cargo High-Low" },
          { value: "fuel_desc", label: "Fuel Cost High-Low" },
        ],
      },
      "/maintenance": {
        searchPlaceholder: "Search maintenance...",
        groupOptions: [
          { value: "none", label: "Group by" },
          { value: "status", label: "Status" },
        ],
        filterOptions: [
          { value: "all", label: "Filter" },
          { value: "status:New", label: "Status: New" },
          { value: "status:In Progress", label: "Status: In Progress" },
          { value: "status:Completed", label: "Status: Completed" },
        ],
        sortOptions: [
          { value: "default", label: "Sort by..." },
          { value: "cost_desc", label: "Cost High-Low" },
          { value: "date_desc", label: "Newest First" },
        ],
      },
      "/expenses": {
        searchPlaceholder: "Search expense...",
        groupOptions: [
          { value: "none", label: "Group by" },
          { value: "status", label: "Status" },
        ],
        filterOptions: [
          { value: "all", label: "Filter" },
          { value: "status:Pending", label: "Status: Pending" },
          { value: "status:Approved", label: "Status: Approved" },
          { value: "status:Done", label: "Status: Done" },
        ],
        sortOptions: [
          { value: "default", label: "Sort by..." },
          { value: "fuel_desc", label: "Fuel Cost High-Low" },
          { value: "total_desc", label: "Total Cost High-Low" },
          { value: "distance_desc", label: "Distance High-Low" },
        ],
      },
      "/performance": {
        searchPlaceholder: "Search driver...",
        groupOptions: [
          { value: "none", label: "Group by" },
          { value: "duty", label: "Duty Status" },
        ],
        filterOptions: [
          { value: "all", label: "Filter" },
          { value: "duty:On Duty", label: "Duty: On Duty" },
          { value: "duty:Off Duty", label: "Duty: Off Duty" },
          { value: "duty:On Break", label: "Duty: On Break" },
          { value: "duty:Suspended", label: "Duty: Suspended" },
        ],
        sortOptions: [
          { value: "default", label: "Sort by..." },
          { value: "safety_desc", label: "Safety Score High-Low" },
          { value: "complaints_desc", label: "Complaints High-Low" },
          { value: "expiry_asc", label: "License Expiry Soonest" },
        ],
      },
      "/analytics": {
        searchPlaceholder: "Search analytics...",
        groupOptions: [
          { value: "none", label: "Group by" },
          { value: "month", label: "Month" },
        ],
        filterOptions: [
          { value: "all", label: "Filter" },
        ],
        sortOptions: [
          { value: "default", label: "Sort by..." },
        ],
      },
    }),
    []
  );

  const currentConfig = routeControlConfig[location.pathname] || null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleViewProfile = () => {
    setProfileOpen(false);
    navigate("/profile");
  };

  const handleTopSearch = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    setTopSearch("");
    setGroupBy("none");
    setFilterBy("all");
    setSortBy("default");
  }, [location.pathname]);

  useEffect(() => {
    if (!currentConfig) return;
    window.dispatchEvent(
      new CustomEvent("fleetflow-table-controls", {
        detail: {
          path: location.pathname,
          search: topSearch.trim(),
          groupBy,
          filterBy,
          sortBy,
        },
      })
    );
  }, [currentConfig, filterBy, groupBy, location.pathname, sortBy, topSearch]);

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <img src="/logo.png" alt="FleetFlow" className="brand-logo-img" />
          </div>
          <span className="brand-text">Fleet Flow</span>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? "nav-item--active" : ""}`
              }
            >
              <span className="nav-icon">{icons[item.icon]}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="main-wrapper">
        {/* Top Header */}
        <header className="topbar">
          <div className="topbar-left">
            <img src="/logo.png" alt="FleetFlow" className="topbar-logo" />
            <h1 className="page-title">Fleet Flow</h1>
          </div>
          <div className="topbar-right">
            <div className="topbar-tools">
              <form className="topbar-search" onSubmit={handleTopSearch}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder={currentConfig?.searchPlaceholder || "Search..."}
                  value={topSearch}
                  onChange={(e) => setTopSearch(e.target.value)}
                  disabled={!currentConfig}
                />
              </form>

              {currentConfig ? (
                <>
                  <select
                    className="topbar-chip topbar-select"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                  >
                    {currentConfig.groupOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    className="topbar-chip topbar-select"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    {currentConfig.filterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    className="topbar-chip topbar-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {currentConfig.sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <button type="button" className="topbar-chip" disabled>
                  Controls not available
                </button>
              )}
            </div>

            <div className="profile-wrap">
              <button
                type="button"
                className="user-avatar"
                title={user?.fullName || "User"}
                onClick={() => setProfileOpen((open) => !open)}
              >
                {initials}
              </button>

              {profileOpen && (
                <div className="profile-menu">
                  <div className="profile-name">{user?.fullName || "User"}</div>
                  <div className="profile-meta">{user?.email || "No email"}</div>
                  <div className="profile-meta">Role: {user?.role || "N/A"}</div>
                  <button type="button" className="profile-view" onClick={handleViewProfile}>
                    View Full Profile
                  </button>
                  <button type="button" className="profile-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content (child routes render here) */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
