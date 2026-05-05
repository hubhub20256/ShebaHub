import { useEffect, useState, useCallback } from "react";
import { adminAPI } from "../../services/api";

const STATUS_OPTIONS = [
  { value: "", label: "הכל" },
  { value: "approved", label: "מאושר" },
  { value: "pending", label: "ממתין" },
  { value: "flagged", label: "מסומן" },
  { value: "rejected", label: "נדחה" },
];

const BADGE_CLASS = {
  approved: "admin-badge-approved",
  pending: "admin-badge-pending",
  flagged: "admin-badge-flagged",
  rejected: "admin-badge-rejected",
};

const BADGE_LABEL = {
  approved: "מאושר",
  pending: "ממתין",
  flagged: "מסומן",
  rejected: "נדחה",
};

const RESEARCH_STATUS_OPTIONS = [
  { value: "draft", label: "טיוטה" },
  { value: "open", label: "פתוח" },
  { value: "in_progress", label: "בתהליך" },
  { value: "completed", label: "הושלם" },
  { value: "cancelled", label: "בוטל" },
];

const MODERATION_OPTIONS = [
  { value: "approved", label: "מאושר" },
  { value: "pending", label: "ממתין" },
  { value: "flagged", label: "מסומן" },
  { value: "rejected", label: "נדחה" },
];

const EDIT_FIELDS = [
  { key: "researchName", label: "שם מחקר", type: "text" },
  { key: "researchArea", label: "תחום מחקר", type: "text" },
  { key: "mentors", label: "מנטורים", type: "text" },
  { key: "status", label: "סטטוס", type: "select", options: RESEARCH_STATUS_OPTIONS },
  { key: "moderation_status", label: "סטטוס מודרציה", type: "select", options: MODERATION_OPTIONS },
  { key: "accepting_applications", label: "מקבל מועמדויות", type: "checkbox" },
  { key: "location", label: "מיקום", type: "text" },
  { key: "workMode", label: "מצב עבודה", type: "text" },
  { key: "compensation", label: "תגמול", type: "text" },
  { key: "helsinkiApproval", label: "אישור הלסינקי", type: "text" },
  { key: "dataType", label: "סוג נתונים", type: "text" },
  { key: "teamSize", label: "גודל צוות, לא כולל מנחים", type: "number" },
  { key: "weeklyHours", label: "שעות שבועיות", type: "number" },
  { key: "durationMonths", label: "משך (חודשים)", type: "number" },
  { key: "startDate", label: "תאריך התחלה", type: "date" },
  { key: "estimatedCompletionDate", label: "תאריך סיום משוער", type: "date" },
  { key: "description", label: "תיאור", type: "textarea", fullWidth: true },
  { key: "requirements", label: "דרישות", type: "textarea", fullWidth: true },
  { key: "skillsAndTools", label: "כישורים וכלים", type: "textarea", fullWidth: true },
  { key: "output", label: "תפוקות", type: "textarea", fullWidth: true },
  { key: "moderation_note", label: "הערת מודרציה", type: "textarea", fullWidth: true },
];

const BULK_ACTIONS = [
  { value: "approve", label: "אשר" },
  { value: "reject", label: "דחה" },
  { value: "flag", label: "סמן" },
  { value: "soft_delete", label: "מחק" },
  { value: "restore", label: "שחזר" },
];

function EditResearchModal({ research, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    const initial = {};
    for (const f of EDIT_FIELDS) {
      const val = research[f.key];
      if (f.type === "checkbox") {
        initial[f.key] = !!val;
      } else if (f.type === "number") {
        initial[f.key] = val != null ? val : "";
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
    // Build patch with only changed fields
    const patch = {};
    for (const f of EDIT_FIELDS) {
      const original = research[f.key];
      let current = form[f.key];

      if (f.type === "number") {
        // Convert empty string to null for number fields
        current = current === "" ? null : Number(current);
        const orig = original == null ? null : Number(original);
        if (current !== orig) patch[f.key] = current;
      } else if (f.type === "checkbox") {
        if (current !== !!original) patch[f.key] = current;
      } else {
        const orig = original != null ? original : "";
        if (current !== orig) patch[f.key] = current;
      }
    }

    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await adminAPI.editResearch(research.id, patch);
      onSave();
    } catch {
      setSaveError("שגיאה בשמירת השינויים");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div
        className="admin-modal admin-edit-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>עריכת מחקר #{research.id}</h3>
        <div className="admin-edit-grid">
          {EDIT_FIELDS.map((f) => (
            <div
              key={f.key}
              className={`admin-edit-field${f.fullWidth ? " full-width" : ""}`}
            >
              <label>{f.label}</label>
              {f.type === "textarea" ? (
                <textarea
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                />
              ) : f.type === "select" ? (
                <select
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
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
          <button
            className="admin-modal-confirm"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "שומר..." : "שמור"}
          </button>
          <button className="admin-modal-cancel" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteModal({ title, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <textarea
          placeholder="הערה (אופציונלי)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="admin-modal-actions">
          <button className="admin-modal-confirm" onClick={() => onConfirm(note)}>
            אישור
          </button>
          <button className="admin-modal-cancel" onClick={onCancel}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminResearches() {
  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [editResearch, setEditResearch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("approve");

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.moderation_status = statusFilter;
    if (includeDeleted) params.include_deleted = "true";
    if (search.trim()) params.search = search.trim();

    adminAPI
      .listResearches(params)
      .then((data) => {
        setResearches(Array.isArray(data) ? data : data.results || []);
        setError("");
      })
      .catch(() => setError("שגיאה בטעינת מחקרים"))
      .finally(() => setLoading(false));
  }, [statusFilter, includeDeleted, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action, id, note = "") => {
    setBusy(true);
    try {
      switch (action) {
        case "approve":
          await adminAPI.approveResearch(id, note);
          break;
        case "reject":
          await adminAPI.rejectResearch(id, note);
          break;
        case "flag":
          await adminAPI.flagResearch(id, note);
          break;
        case "soft-delete":
          await adminAPI.softDeleteResearch(id, note);
          break;
        case "restore":
          await adminAPI.restoreResearch(id);
          break;
      }
      fetchData();
    } catch {
      setError("שגיאה בביצוע הפעולה");
    } finally {
      setBusy(false);
      setModal(null);
    }
  };

  const openModal = (action, id, title) => {
    setModal({ action, id, title });
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
    if (selectedIds.size === researches.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(researches.map((r) => r.id)));
    }
  };

  const handleBulk = async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      await adminAPI.bulkResearchAction([...selectedIds], bulkAction);
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
      if (statusFilter) params.moderation_status = statusFilter;
      if (includeDeleted) params.include_deleted = "true";
      if (search.trim()) params.search = search.trim();
      await adminAPI.exportResearchesCsv(params);
    } catch {
      setError("שגיאה בייצוא");
    }
  };

  return (
    <div>
      {modal && (
        <NoteModal
          title={modal.title}
          onConfirm={(note) => handleAction(modal.action, modal.id, note)}
          onCancel={() => setModal(null)}
        />
      )}

      {editResearch && (
        <EditResearchModal
          research={editResearch}
          onSave={() => {
            setEditResearch(null);
            fetchData();
          }}
          onCancel={() => setEditResearch(null)}
        />
      )}

      <div className="admin-filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          כולל מחוקים
        </label>

        <input
          type="text"
          placeholder="חיפוש לפי שם מחקר..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

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
      ) : researches.length === 0 ? (
        <div className="admin-empty">לא נמצאו מחקרים</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === researches.length && researches.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>#</th>
                <th>שם מחקר</th>
                <th>בעלים</th>
                <th>סטטוס</th>
                <th>מודרציה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {researches.map((r) => (
                <tr key={r.id} style={r.is_deleted ? { opacity: 0.5 } : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                    />
                  </td>
                  <td>{r.id}</td>
                  <td>{r.researchName}</td>
                  <td>{r.owner_name}</td>
                  <td>{r.status}</td>
                  <td>
                    <span className={`admin-badge ${BADGE_CLASS[r.moderation_status] || ""}`}>
                      {BADGE_LABEL[r.moderation_status] || r.moderation_status}
                    </span>
                    {r.is_deleted && (
                      <span className="admin-badge admin-badge-deleted" style={{ marginRight: 4 }}>
                        נמחק
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-btn admin-btn-edit"
                        disabled={busy}
                        onClick={() => setEditResearch(r)}
                      >
                        ערוך
                      </button>
                      {!r.is_deleted && r.moderation_status !== "approved" && (
                        <button
                          className="admin-btn admin-btn-approve"
                          disabled={busy}
                          onClick={() => openModal("approve", r.id, "אישור מחקר")}
                        >
                          אשר
                        </button>
                      )}
                      {!r.is_deleted && r.moderation_status !== "rejected" && (
                        <button
                          className="admin-btn admin-btn-reject"
                          disabled={busy}
                          onClick={() => openModal("reject", r.id, "דחיית מחקר")}
                        >
                          דחה
                        </button>
                      )}
                      {!r.is_deleted && r.moderation_status !== "flagged" && (
                        <button
                          className="admin-btn admin-btn-flag"
                          disabled={busy}
                          onClick={() => openModal("flag", r.id, "סימון מחקר")}
                        >
                          סמן
                        </button>
                      )}
                      {!r.is_deleted && (
                        <button
                          className="admin-btn admin-btn-delete"
                          disabled={busy}
                          onClick={() => openModal("soft-delete", r.id, "מחיקת מחקר")}
                        >
                          מחק
                        </button>
                      )}
                      {r.is_deleted && (
                        <button
                          className="admin-btn admin-btn-restore"
                          disabled={busy}
                          onClick={() => handleAction("restore", r.id)}
                        >
                          שחזר
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
