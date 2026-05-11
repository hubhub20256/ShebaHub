import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../services/api";

const FIELDS = [
  {
    key: "max_applications_per_student",
    label: "מקסימום מועמדויות לסטודנט",
    type: "number",
    help: "0 = ללא הגבלה",
  },
  {
    key: "max_applications_per_research",
    label: "מקסימום מועמדויות למחקר",
    type: "number",
    help: "0 = ללא הגבלה",
  },
  {
    key: "default_moderation_status",
    label: "סטטוס מודרציה ברירת מחדל",
    type: "select",
    options: [
      { value: "approved", label: "מאושר" },
      { value: "pending", label: "ממתין" },
    ],
  },
  {
    key: "contact_message_max_length",
    label: "אורך מקסימלי להודעת קשר",
    type: "number",
    help: "בין 100 ל-10,000",
  },
  {
    key: "mentor_note_max_length",
    label: "אורך מקסימלי להערת מנחה",
    type: "number",
    help: "בין 100 ל-5,000",
  },
  {
    key: "applications_globally_enabled",
    label: "הגשת מועמדויות מופעלת",
    type: "toggle",
  },
  {
    key: "registration_enabled",
    label: "הרשמה מופעלת",
    type: "toggle",
  },
  {
    key: "student_registration_enabled",
    label: "הרשמה כסטודנט מופעלת",
    type: "toggle",
  },
  {
    key: "mentor_registration_enabled",
    label: "הרשמה כמנטור מופעלת",
    type: "toggle",
  },
  {
    key: "require_email_verification_to_apply",
    label: "דרוש אימות אימייל להגשה",
    type: "toggle",
  },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await adminAPI.getSettings();
      setSettings(data);
      setForm(data);
    } catch {
      setFeedback({ type: "error", text: "שגיאה בטעינת ההגדרות." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  };

  const handleSave = async () => {
    // Only send changed fields
    const patch = {};
    for (const field of FIELDS) {
      const k = field.key;
      if (form[k] !== settings[k]) {
        patch[k] = form[k];
      }
    }
    if (Object.keys(patch).length === 0) {
      setFeedback({ type: "info", text: "לא בוצעו שינויים." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const data = await adminAPI.updateSettings(patch);
      setSettings(data);
      setForm(data);
      setFeedback({ type: "success", text: "ההגדרות נשמרו בהצלחה." });
    } catch (err) {
      const detail = err?.data?.detail || Object.values(err?.data || {}).flat().join(", ");
      setFeedback({ type: "error", text: detail || "שגיאה בשמירת ההגדרות." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-loading">טוען הגדרות...</div>;

  return (
    <div className="admin-settings-form">
      {FIELDS.map((field) => (
        <div key={field.key} className="admin-settings-field">
          <label>{field.label}</label>

          {field.type === "number" && (
            <div>
              <input
                type="number"
                min="0"
                value={form[field.key] ?? 0}
                onChange={(e) =>
                  handleChange(field.key, parseInt(e.target.value, 10) || 0)
                }
              />
              {field.help && (
                <span className="admin-settings-help">{field.help}</span>
              )}
            </div>
          )}

          {field.type === "select" && (
            <select
              value={form[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.type === "toggle" && (
            <label className="admin-settings-toggle">
              <input
                type="checkbox"
                checked={!!form[field.key]}
                onChange={(e) => handleChange(field.key, e.target.checked)}
              />
              <span>{form[field.key] ? "פעיל" : "כבוי"}</span>
            </label>
          )}
        </div>
      ))}

      <div className="admin-settings-save-bar">
        <button
          className="admin-btn admin-btn-approve"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "שומר..." : "שמור הגדרות"}
        </button>
        {feedback && (
          <span
            className={
              feedback.type === "success"
                ? "admin-success"
                : feedback.type === "error"
                ? "admin-error"
                : "admin-info"
            }
          >
            {feedback.text}
          </span>
        )}
      </div>
    </div>
  );
}
