import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import "./Analytics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const POLL_INTERVAL = 8000; // live-refresh every 8 seconds

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = JSON.parse(localStorage.getItem("fleetflow_user"))?.token;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAnalytics = useCallback(() => {
    axios
      .get(`${API}/analytics`, { headers })
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Initial fetch + live polling
  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  /* ── Export Helpers ─────────────────────────────── */
  const exportPDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("FleetFlow — Operational Analytics", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // KPIs
    doc.setFontSize(12);
    doc.text("Key Metrics", 14, 38);
    autoTable(doc, {
      startY: 42,
      head: [["Metric", "Value"]],
      body: [
        ["Total Fleet", data.fleet.total],
        ["Utilization Rate", `${data.fleet.utilization}%`],
        ["Fleet ROI", `${data.financials.roiPercent > 0 ? "+" : ""}${data.financials.roiPercent}%`],
        ["Total Fuel Cost", `Rs. ${data.financials.totalFuel.toLocaleString()}`],
        ["Total Maintenance", `Rs. ${data.financials.totalMaintenance.toLocaleString()}`],
        ["Total Revenue", `Rs. ${data.financials.totalRevenue.toLocaleString()}`],
      ],
    });

    // Monthly summary table
    if (data.monthlySummary.length) {
      doc.text("Monthly Financial Summary", 14, doc.lastAutoTable.finalY + 12);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [["Month", "Revenue", "Fuel Cost", "Maintenance", "Net Profit"]],
        body: data.monthlySummary.map((m) => [
          m.label,
          `Rs. ${m.revenue.toLocaleString()}`,
          `Rs. ${m.fuelCost.toLocaleString()}`,
          `Rs. ${m.maintenance.toLocaleString()}`,
          `Rs. ${m.netProfit.toLocaleString()}`,
        ]),
      });
    }

    // Dead stock
    if (data.deadStock.length) {
      doc.addPage();
      doc.text("Dead Stock Alerts", 14, 20);
      autoTable(doc, {
        startY: 24,
        head: [["Plate", "Model", "Type", "Status"]],
        body: data.deadStock.map((v) => [v.licensePlate, v.model, v.type, v.status]),
      });
    }

    doc.save("FleetFlow_Analytics_Report.pdf");
  };

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    // Monthly sheet
    if (data.monthlySummary.length) {
      const ws1 = XLSX.utils.json_to_sheet(
        data.monthlySummary.map((m) => ({
          Month: m.label,
          Revenue: m.revenue,
          "Fuel Cost": m.fuelCost,
          Maintenance: m.maintenance,
          "Net Profit": m.netProfit,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws1, "Monthly Summary");
    }

    // Top costliest
    if (data.top5Costliest.length) {
      const ws2 = XLSX.utils.json_to_sheet(
        data.top5Costliest.map((v) => ({
          Plate: v.licensePlate,
          Model: v.model,
          "Fuel Cost": v.fuelCost,
          "Misc Cost": v.miscCost,
          Maintenance: v.maintCost,
          "Grand Total": v.grandTotal,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws2, "Top Costliest Vehicles");
    }

    // Dead stock
    if (data.deadStock.length) {
      const ws3 = XLSX.utils.json_to_sheet(
        data.deadStock.map((v) => ({
          Plate: v.licensePlate,
          Model: v.model,
          Type: v.type,
          Status: v.status,
          Odometer: v.odometer,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws3, "Dead Stock");
    }

    XLSX.writeFile(wb, "FleetFlow_Analytics_Report.xlsx");
  };

  /* ── Render ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="analytics-page">
        <div className="table-loading">Loading analytics…</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="analytics-page">
        <div className="table-empty">Unable to load analytics data.</div>
      </div>
    );
  }

  const { fleet, financials, fuelEfficiencyTrend, top5Costliest, monthlySummary, deadStock } = data;

  /* ── Chart configs ───────────────────────────────── */

  // 1. Fuel Efficiency Trend (Line)
  const fuelLineData = {
    labels: fuelEfficiencyTrend.map((d) => d.label),
    datasets: [
      {
        label: "Fuel Efficiency (km/₹)",
        data: fuelEfficiencyTrend.map((d) => d.efficiency),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37,99,235,0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#2563eb",
      },
    ],
  };
  const fuelLineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "km / ₹" } },
    },
  };

  // 2. Top 5 Costliest Vehicles (Bar)
  const costBarData = {
    labels: top5Costliest.map((v) => v.licensePlate),
    datasets: [
      {
        label: "Fuel",
        data: top5Costliest.map((v) => v.fuelCost),
        backgroundColor: "#3b82f6",
        borderRadius: 4,
      },
      {
        label: "Misc",
        data: top5Costliest.map((v) => v.miscCost),
        backgroundColor: "#a855f7",
        borderRadius: 4,
      },
      {
        label: "Maintenance",
        data: top5Costliest.map((v) => v.maintCost),
        backgroundColor: "#f97316",
        borderRadius: 4,
      },
    ],
  };
  const costBarOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, title: { display: true, text: "₹" } },
    },
  };

  // 3. Fleet Status Doughnut
  const fleetDoughnutData = {
    labels: ["Available", "On Trip", "In Shop", "Retired"],
    datasets: [
      {
        data: [fleet.available, fleet.onTrip, fleet.inShop, fleet.retired],
        backgroundColor: ["#10b981", "#2563eb", "#f59e0b", "#94a3b8"],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };
  const fleetDoughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: { legend: { position: "bottom", labels: { padding: 16 } } },
  };

  const formatRs = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  return (
    <div className="analytics-page">
      {/* ── Header ── */}
      <div className="an-header">
        <div>
          <h2 className="an-title">Operational Analytics &amp; Financial Reports</h2>
          <p className="an-subtitle">
            Live data visualizations — auto-refreshes every {POLL_INTERVAL / 1000}s
          </p>
        </div>
        <div className="an-export-btns">
          <button className="btn btn--primary" onClick={exportPDF}>
            📄 Export PDF
          </button>
          <button className="btn btn--outline" onClick={exportExcel}>
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="an-kpi-grid">
        <div className="an-kpi an-kpi--fuel">
          <span className="an-kpi-icon">⛽</span>
          <div>
            <span className="an-kpi-val">{formatRs(financials.totalFuel)}</span>
            <span className="an-kpi-lbl">Total Fuel Cost</span>
          </div>
        </div>
        <div className="an-kpi an-kpi--roi">
          <span className="an-kpi-icon">📈</span>
          <div>
            <span className="an-kpi-val">
              {financials.roiPercent > 0 ? "+" : ""}
              {financials.roiPercent}%
            </span>
            <span className="an-kpi-lbl">Fleet ROI</span>
          </div>
        </div>
        <div className="an-kpi an-kpi--util">
          <span className="an-kpi-icon">🚛</span>
          <div>
            <span className="an-kpi-val">{fleet.utilization}%</span>
            <span className="an-kpi-lbl">Utilization Rate</span>
          </div>
        </div>
      </div>

      {/* ── Charts Row: Fuel Efficiency Trend + Top 5 Costliest ── */}
      <div className="an-charts-row">
        <div className="an-chart-card">
          <h3>Fuel Efficiency Trend (km/₹)</h3>
          <div className="an-chart-body">
            {fuelEfficiencyTrend.length === 0 ? (
              <div className="table-empty">Add expenses with distance data to see trends</div>
            ) : (
              <Line data={fuelLineData} options={fuelLineOpts} />
            )}
          </div>
        </div>
        <div className="an-chart-card">
          <h3>Top 5 Costliest Vehicles</h3>
          <div className="an-chart-body">
            {top5Costliest.length === 0 ? (
              <div className="table-empty">No cost data yet</div>
            ) : (
              <Bar data={costBarData} options={costBarOpts} />
            )}
          </div>
        </div>
      </div>

      {/* ── Fleet Status Donut + Dead Stock ── */}
      <div className="an-charts-row">
        <div className="an-chart-card an-chart--sm">
          <h3>Fleet Status</h3>
          <div className="an-chart-body an-donut-body">
            {fleet.total === 0 ? (
              <div className="table-empty">No vehicles registered</div>
            ) : (
              <Doughnut data={fleetDoughnutData} options={fleetDoughnutOpts} />
            )}
          </div>
        </div>
        <div className="an-chart-card an-chart--lg">
          <h3>
            Dead Stock Alerts
            <span className="an-count">{deadStock.length} idle vehicles</span>
          </h3>
          {deadStock.length === 0 ? (
            <div className="table-empty">All vehicles active in last 30 days 🎉</div>
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

      {/* ── Financial Summary of Month ── */}
      <div className="an-section">
        <h3>Financial Summary of Month</h3>
        {monthlySummary.length === 0 ? (
          <div className="table-empty">
            No monthly data yet — create trips &amp; expenses to populate.
          </div>
        ) : (
          <div className="an-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Revenue</th>
                  <th>Fuel Cost</th>
                  <th>Maintenance</th>
                  <th>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map((m, i) => (
                  <tr key={i}>
                    <td className="text-bold">{m.label}</td>
                    <td className="text-green">₹{m.revenue.toLocaleString()}</td>
                    <td className="text-blue">₹{m.fuelCost.toLocaleString()}</td>
                    <td className="text-orange">₹{m.maintenance.toLocaleString()}</td>
                    <td className={m.netProfit >= 0 ? "text-green text-bold" : "text-red text-bold"}>
                      ₹{m.netProfit.toLocaleString()}
                    </td>
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
