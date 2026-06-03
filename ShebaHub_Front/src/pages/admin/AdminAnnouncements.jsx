import { useEffect, useState, useCallback } from "react";
import { adminAPI } from "../../services/api";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "כולם" },
  { value: "mentors", label: "מנחים" },
  { value: "students", label: "סטודנטים" },
];

const PRIORITY_OPTIONS = [
  { value: "info", label: "מידע" },
  { value: "warning", label: "אזהרה" },
  { value: "critical", label: "קריטי" },
];

const AUDIENCE_LABEL = { all: "כולם", mentors: "מנחים", students: "סטודנטים" };
const PRIORITY_LABEL = { info: "מידע", warning: "אזהרה", critical: "קריטי" };

const PRIORITY_BADGE = {
  info: "admin-badge-approved",
  warning: "admin-badge-pending",
  critical: "admin-badge-flagged",
};

function AnnouncementModal({ announcement, onSave, onCancel }) {
  const isEdit = !!announcement;
  const [form, setForm] = useState({
    title: announcement?.title || "",
    body: announcement?.body || "",
    audience: announcement?.audience || "all",
    priority: announcement?.priority || "info",
    expires_at: announcement?.expires_at ? announcement.expires_at.slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setSaveError("יש למלא כותרת ותוכן");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const data = {
        title: form.title,
        body: form.body,
        audience: form.audience,
        priority: form.priority,
      };
      if (form.expires_at) {
        data.expires_at = new Date(form.expires_at).toISOString();
      }

      if (isEdit) {
        await adminAPI.updateAnnouncement(announcement.id, data);
      } else {
        await adminAPI.createAnnouncement(data);
      }
      onSave();
    } catch (err) {
      const detail = err?.data?.detail || err?.data?.non_field_errors?.[0];
      if (detail) {
        setSaveError(detail);
      } else if (err?.data && typeof err.data === "object" && Object.keys(err.data).length > 0) {
        const firstKey = Object.keys(err.data)[0];
        const firstErr = Array.isArray(err.data[firstKey]) ? err.data[firstKey][0] : err.data[firstKey];
        setSaveError(`${firstKey}: ${firstErr}`);
      } else {
        setSaveError("שגיאה בשמירה — ודאו שהמיגרציה הורצה בשרת");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? "עריכת הודעה" : "צור הודעה"}</h3>
        <div className="admin-edit-grid">
          <div className="admin-edit-field full-width">
            <label>כותרת</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="admin-edit-field">
            <label>קהל יעד</label>
            <select
              value={form.audience}
              onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))}
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="admin-edit-field">
            <label>עדיפות</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="admin-edit-field">
            <label>תפוגה (אופציונלי)</label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
            />
          </div>
          <div className="admin-edit-field full-width">
            <label>תוכן</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              rows={4}
            />
          </div>
        </div>
        {saveError && <div className="admin-error">{saveError}</div>}
        <div className="admin-modal-actions">
          <button className="admin-modal-confirm" disabled={saving} onClick={handleSubmit}>
            {saving ? "שומר..." : "שמור"}
          </button>
          <button className="admin-modal-cancel" onClick={onCancel}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // null | "create" | announcement object
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    adminAPI
      .listAnnouncements()
      .then((data) => {
        setAnnouncements(data);
        setError("");
      })
      .catch(() => setError("שגיאה בטעינת הודעות"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeactivate = async (id) => {
    setBusy(true);
    try {
      await adminAPI.deactivateAnnouncement(id);
      fetchData();
    } catch {
      setError("שגיאה בביטול הודעה");
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("he-IL");
  };

  const getStatus = (a) => {
    if (!a.is_active) return "לא פעיל";
    if (a.expires_at && new Date(a.expires_at) < new Date()) return "פג תוקף";
    return "פעיל";
  };

  const getStatusClass = (a) => {
    if (!a.is_active) return "admin-badge-inactive";
    if (a.expires_at && new Date(a.expires_at) < new Date()) return "admin-badge-deleted";
    return "admin-badge-active";
  };

  return (
    <div>
      {modal && (
        <AnnouncementModal
          announcement={modal === "create" ? null : modal}
          onSave={() => {
            setModal(null);
            fetchData();
          }}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="admin-filter-bar">
        <button className="admin-btn admin-btn-create" onClick={() => setModal("create")}>
          צור הודעה
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <div className="admin-loading">טוען...</div>
      ) : announcements.length === 0 ? (
        <div className="admin-empty">אין הודעות מערכת</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>כותרת</th>
                <th>קהל</th>
                <th>עדיפות</th>
                <th>סטטוס</th>
                <th>דחיות</th>
                <th>נוצר</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>
                    <span className="admin-badge admin-badge-audience">
                      {AUDIENCE_LABEL[a.audience] || a.audience}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${PRIORITY_BADGE[a.priority] || ""}`}>
                      {PRIORITY_LABEL[a.priority] || a.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge ${getStatusClass(a)}`}>
                      {getStatus(a)}
                    </span>
                  </td>
                  <td>{a.dismissal_count || 0}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(a.created_at)}</td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-btn admin-btn-edit"
                        disabled={busy}
                        onClick={() => setModal(a)}
                      >
                        ערוך
                      </button>
                      {a.is_active && (
                        <button
                          className="admin-btn admin-btn-reject"
                          disabled={busy}
                          onClick={() => handleDeactivate(a.id)}
                        >
                          בטל
                        </button>
                      )}
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
