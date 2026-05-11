import { useEffect, useState, useCallback } from "react";
import { adminAPI } from "../../services/api";

const GENDER_OPTIONS = [
  { value: "", label: "---" },
  { value: "man", label: "גבר" },
  { value: "woman", label: "אישה" },
  { value: "other", label: "אחר" },
];

const EDIT_FIELDS = [
  { key: "firstName", label: "שם פרטי", type: "text" },
  { key: "lastName", label: "שם משפחה", type: "text" },
  { key: "gender", label: "מגדר", type: "select", options: GENDER_OPTIONS },
  { key: "is_staff", label: "אדמין", type: "checkbox" },
  { key: "email_verified", label: "אימייל מאומת", type: "checkbox" },
  { key: "is_active", label: "פעיל", type: "checkbox" },
];

const BULK_ACTIONS = [
  { value: "deactivate", label: "השבת" },
  { value: "reactivate", label: "הפעל" },
  { value: "force_verify", label: "אמת אימייל" },
];

function EditUserModal({ user, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    const initial = {};
    for (const f of EDIT_FIELDS) {
      const val = user[f.key];
      if (f.type === "checkbox") {
        initial[f.key] = !!val;
      } else {
        initial[f.key] = val != null ? val : "";
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const patch = {};
    for (const f of EDIT_FIELDS) {
      const original = user[f.key];
      const current = form[f.key];
      if (f.type === "checkbox") {
        if (current !== !!original) patch[f.key] = current;
      } else {
        const orig = original != null ? original : "";
        if (current !== orig) patch[f.key] = current || null;
      }
    }

    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await adminAPI.editUser(user.id, patch);
      onSave();
    } catch (err) {
      setSaveError(err?.data?.detail || "שגיאה בשמירת השינויים");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal admin-edit-modal" onClick={(e) => e.stopPropagation()}>
        <h3>עריכת משתמש</h3>
        <div className="admin-edit-grid">
          {EDIT_FIELDS.map((f) => (
            <div key={f.key} className="admin-edit-field">
              <label>{f.label}</label>
              {f.type === "select" ? (
                <select value={form[f.key]} onChange={(e) => handleChange(f.key, e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.checked)}
                />
              ) : (
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
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

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("deactivate");

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search.trim()) params.search = search.trim();
    if (activeFilter) params.is_active = activeFilter;

    adminAPI
      .listUsers(params)
      .then((data) => {
        setUsers(Array.isArray(data) ? data : data.results || []);
        setError("");
      })
      .catch(() => setError("שגיאה בטעינת משתמשים"))
      .finally(() => setLoading(false));
  }, [search, activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action, id) => {
    setBusy(true);
    try {
      switch (action) {
        case "deactivate":
          await adminAPI.deactivateUser(id);
          break;
        case "reactivate":
          await adminAPI.reactivateUser(id);
          break;
        case "force-verify":
          await adminAPI.forceVerifyUser(id);
          break;
      }
      fetchData();
    } catch (err) {
      const msg = err?.data?.detail || "שגיאה בביצוע הפעולה";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulk = async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      await adminAPI.bulkUserAction([...selectedIds], bulkAction);
      setSelectedIds(new Set());
      fetchData();
    } catch {
      setError("שגיאה בביצוע פעולה מרובה");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (activeFilter) params.is_active = activeFilter;
      await adminAPI.exportUsersCsv(params);
    } catch {
      setError("שגיאה בייצוא");
    }
  };

  return (
    <div>
      {editUser && (
        <EditUserModal
          user={editUser}
          onSave={() => {
            setEditUser(null);
            fetchData();
          }}
          onCancel={() => setEditUser(null)}
        />
      )}

      <div className="admin-filter-bar">
        <input
          type="text"
          placeholder="חיפוש לפי שם או אימייל..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="">כל המשתמשים</option>
          <option value="true">פעילים</option>
          <option value="false">מושבתים</option>
        </select>

        <button className="admin-btn admin-btn-export" onClick={handleExport}>
          ייצוא CSV
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="admin-bulk-bar">
          <span>{selectedIds.size} נבחרו</span>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
            {BULK_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <button className="admin-btn admin-btn-approve" disabled={busy} onClick={handleBulk}>
            בצע
          </button>
          <button className="admin-btn admin-btn-delete" onClick={() => setSelectedIds(new Set())}>
            נקה בחירה
          </button>
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <div className="admin-loading">טוען...</div>
      ) : users.length === 0 ? (
        <div className="admin-empty">לא נמצאו משתמשים</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>אימייל</th>
                <th>שם</th>
                <th>סטטוס</th>
                <th>אימייל מאומת</th>
                <th>סוג</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                    />
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {u.firstName} {u.lastName}
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        u.is_active ? "admin-badge-active" : "admin-badge-inactive"
                      }`}
                    >
                      {u.is_active ? "פעיל" : "מושבת"}
                    </span>
                  </td>
                  <td>{u.email_verified ? "כן" : "לא"}</td>
                  <td>
                    {u.is_superuser
                      ? "סופר-אדמין"
                      : u.is_staff
                      ? "אדמין"
                      : u.has_mentor_profile
                      ? "מנחה"
                      : u.has_student_profile
                      ? "סטודנט"
                      : "ללא פרופיל"}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-btn admin-btn-edit"
                        disabled={busy}
                        onClick={() => setEditUser(u)}
                      >
                        ערוך
                      </button>
                      {u.is_active && !u.is_superuser && (
                        <button
                          className="admin-btn admin-btn-reject"
                          disabled={busy}
                          onClick={() => handleAction("deactivate", u.id)}
                        >
                          השבת
                        </button>
                      )}
                      {!u.is_active && (
                        <button
                          className="admin-btn admin-btn-approve"
                          disabled={busy}
                          onClick={() => handleAction("reactivate", u.id)}
                        >
                          הפעל
                        </button>
                      )}
                      {!u.email_verified && (
                        <button
                          className="admin-btn admin-btn-verify"
                          disabled={busy}
                          onClick={() => handleAction("force-verify", u.id)}
                        >
                          אמת אימייל
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
