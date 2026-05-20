import { useEffect, useState, useCallback } from "react";
import { adminAPI } from "../../services/api";

const STATUS_OPTIONS = [
  { value: "", label: "הכל" },
  { value: "pending", label: "ממתין" },
  { value: "approved", label: "מאושר" },
  { value: "rejected", label: "נדחה" },
  { value: "cancelled", label: "בוטל" },
  { value: "invited", label: "הוזמן" },
];

const STATUS_BADGE = {
  pending: "admin-badge-pending",
  approved: "admin-badge-approved",
  rejected: "admin-badge-rejected",
  cancelled: "admin-badge-deleted",
  invited: "admin-badge-flagged",
};

const STATUS_LABEL = {
  pending: "ממתין",
  approved: "מאושר",
  rejected: "נדחה",
  cancelled: "בוטל",
  invited: "הוזמן",
};

function OverrideModal({ application, onConfirm, onCancel }) {
  const [newStatus, setNewStatus] = useState(application.status);
  const [note, setNote] = useState("");

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>שינוי סטטוס מועמדות #{application.id}</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>סטטוס חדש</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            style={{ display: "block", marginTop: 4, width: "100%", padding: "8px" }}
          >
            {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <textarea
          placeholder="הערה (אופציונלי)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="admin-modal-actions">
          <button className="admin-modal-confirm" onClick={() => onConfirm(newStatus, note)}>
            אישור
          </button>
          <button className="admin-modal-cancel" onClick={onCancel}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [overrideApp, setOverrideApp] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (search.trim()) params.search = search.trim();

    adminAPI
      .listApplications(params)
      .then((data) => {
        setApplications(Array.isArray(data) ? data : data.results || []);
        setError("");
      })
      .catch(() => setError("שגיאה בטעינת מועמדויות"))
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOverride = async (newStatus, note) => {
    if (!overrideApp) return;
    setBusy(true);
    try {
      await adminAPI.overrideApplicationStatus(overrideApp.id, newStatus, note);
      fetchData();
    } catch {
      setError("שגיאה בשינוי סטטוס");
    } finally {
      setBusy(false);
      setOverrideApp(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("he-IL");
  };

  return (
    <div>
      {overrideApp && (
        <OverrideModal
          application={overrideApp}
          onConfirm={handleOverride}
          onCancel={() => setOverrideApp(null)}
        />
      )}

      <div className="admin-filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="חיפוש לפי מועמד..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <div className="admin-loading">טוען...</div>
      ) : applications.length === 0 ? (
        <div className="admin-empty">לא נמצאו מועמדויות</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>מחקר</th>
                <th>שם מועמד</th>
                <th>אימייל מועמד</th>
                <th>סטטוס</th>
                <th>הערת מנחה</th>
                <th>תאריך</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td>{app.id}</td>
                  <td>{app.research_name}</td>
                  <td>{app.applicant_name}</td>
                  <td>{app.applicant_email}</td>
                  <td>
                    <span className={`admin-badge ${STATUS_BADGE[app.status] || ""}`}>
                      {STATUS_LABEL[app.status] || app.status}
                    </span>
                  </td>
                  <td>{app.mentor_note || "-"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(app.created_at)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-btn admin-btn-edit"
                        disabled={busy}
                        onClick={() => setOverrideApp(app)}
                      >
                        שנה סטטוס
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
