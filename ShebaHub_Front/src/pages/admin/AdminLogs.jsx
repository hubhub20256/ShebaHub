import { useEffect, useState, useCallback } from "react";
import { adminAPI } from "../../services/api";

const ACTION_LABELS = {
  research_approve: "אישור מחקר",
  research_reject: "דחיית מחקר",
  research_flag: "סימון מחקר",
  research_soft_delete: "מחיקת מחקר",
  research_restore: "שחזור מחקר",
  user_deactivate: "השבתת משתמש",
  user_reactivate: "הפעלת משתמש",
  user_force_verify: "אימות אימייל",
  research_edit: "עריכת מחקר",
  settings_updated: "עדכון הגדרות",
  announcement_create: "יצירת הודעה",
  announcement_update: "עדכון הודעה",
  announcement_deactivate: "ביטול הודעה",
  user_edit: "עריכת משתמש",
  application_override: "שינוי סטטוס מועמדות",
};

const ACTION_TYPE_OPTIONS = [
  { value: "", label: "כל הפעולות" },
  { value: "research_approve", label: "אישור מחקר" },
  { value: "research_reject", label: "דחיית מחקר" },
  { value: "research_flag", label: "סימון מחקר" },
  { value: "research_soft_delete", label: "מחיקת מחקר" },
  { value: "research_restore", label: "שחזור מחקר" },
  { value: "research_edit", label: "עריכת מחקר" },
  { value: "user_deactivate", label: "השבתת משתמש" },
  { value: "user_reactivate", label: "הפעלת משתמש" },
  { value: "user_force_verify", label: "אימות אימייל" },
  { value: "user_edit", label: "עריכת משתמש" },
  { value: "settings_updated", label: "עדכון הגדרות" },
  { value: "announcement_create", label: "יצירת הודעה" },
  { value: "announcement_update", label: "עדכון הודעה" },
  { value: "announcement_deactivate", label: "ביטול הודעה" },
  { value: "application_override", label: "שינוי סטטוס מועמדות" },
];

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (actionTypeFilter) params.action_type = actionTypeFilter;

    adminAPI
      .getLogs(params)
      .then((data) => {
        setLogs(data);
        setError("");
      })
      .catch(() => setError("שגיאה בטעינת יומן"))
      .finally(() => setLoading(false));
  }, [actionTypeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("he-IL");
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (actionTypeFilter) params.action_type = actionTypeFilter;
      await adminAPI.exportLogsCsv(params);
    } catch {
      setError("שגיאה בייצוא");
    }
  };

  return (
    <div>
      <div className="admin-filter-bar">
        <select value={actionTypeFilter} onChange={(e) => setActionTypeFilter(e.target.value)}>
          {ACTION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button className="admin-btn admin-btn-export" onClick={handleExport}>
          ייצוא CSV
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <div className="admin-loading">טוען...</div>
      ) : logs.length === 0 ? (
        <div className="admin-empty">אין רשומות ביומן</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>פעולה</th>
                <th>אדמין</th>
                <th>משתמש יעד</th>
                <th>מחקר #</th>
                <th>הערה</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(log.created_at)}</td>
                  <td>{ACTION_LABELS[log.action_type] || log.action_type}</td>
                  <td>{log.admin_email || "-"}</td>
                  <td>{log.target_user_email || "-"}</td>
                  <td>{log.target_research_id || "-"}</td>
                  <td>{log.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
