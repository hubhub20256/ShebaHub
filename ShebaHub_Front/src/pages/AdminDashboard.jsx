import { useState } from "react";
import AdminOverview from "./admin/AdminOverview";
import AdminResearches from "./admin/AdminResearches";
import AdminUsers from "./admin/AdminUsers";
import AdminLogs from "./admin/AdminLogs";
import AdminSettings from "./admin/AdminSettings";
import AdminAnnouncements from "./admin/AdminAnnouncements";
import AdminApplications from "./admin/AdminApplications";
import "../styles/AdminDashboard.css";

const TABS = [
  { key: "overview", label: "סקירה כללית" },
  { key: "researches", label: "ניהול מחקרים" },
  { key: "users", label: "ניהול משתמשים" },
  { key: "applications", label: "ניהול מועמדויות" },
  { key: "announcements", label: "הודעות מערכת" },
  { key: "logs", label: "יומן פעולות" },
  { key: "settings", label: "הגדרות" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="admin-dashboard">
      <h1>פאנל ניהול</h1>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <AdminOverview />}
      {activeTab === "researches" && <AdminResearches />}
      {activeTab === "users" && <AdminUsers />}
      {activeTab === "applications" && <AdminApplications />}
      {activeTab === "announcements" && <AdminAnnouncements />}
      {activeTab === "logs" && <AdminLogs />}
      {activeTab === "settings" && <AdminSettings />}
    </div>
  );
}
