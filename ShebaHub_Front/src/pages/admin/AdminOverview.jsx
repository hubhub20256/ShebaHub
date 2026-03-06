import { useEffect, useState } from "react";
import { adminAPI } from "../../services/api";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminAPI
      .getStats()
      .then(setStats)
      .catch(() => setError("שגיאה בטעינת נתונים"));
  }, []);

  if (error) return <div className="admin-error">{error}</div>;
  if (!stats) return <div className="admin-loading">טוען...</div>;

  const cards = [
    { label: "סה״כ משתמשים", value: stats.total_users },
    { label: "משתמשים פעילים", value: stats.active_users },
    { label: "משתמשים מושבתים", value: stats.deactivated_users },
    { label: "אימייל לא מאומת", value: stats.unverified_emails },
    { label: "סה״כ מחקרים", value: stats.total_researches },
    { label: "ממתינים לאישור", value: stats.pending_researches },
    { label: "מסומנים", value: stats.flagged_researches },
    { label: "מחקרים שנמחקו", value: stats.deleted_researches },
    { label: "סה״כ מועמדויות", value: stats.total_applications },
    { label: "מועמדויות ממתינות", value: stats.pending_applications },
    { label: "הודעות מערכת פעילות", value: stats.active_announcements },
  ];

  return (
    <div className="admin-stats-grid">
      {cards.map((c) => (
        <div key={c.label} className="admin-stat-card">
          <div className="stat-value">{c.value}</div>
          <div className="stat-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
