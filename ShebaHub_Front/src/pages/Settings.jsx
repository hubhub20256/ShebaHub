import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { authAPI, profilesAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import "../styles/Settings.css";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Settings states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [topics, setTopics] = useState("");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.notification_topics) {
        setTopics(user.notification_topics.join(", "));
      }
    }
  }, [user]);

  // Handle theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleUpdateEmailAndTopics = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const topicArray = topics
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      await authAPI.updateSettings({ notification_topics: topicArray });
      setMessage("הגדרות עודכנו בהצלחה. יש לרענן כדי לראות שינויים או להתחבר מחדש במידת הצורך.");
      // We might need to refresh auth context here ideally.
    } catch (err) {
      setError(err?.data?.detail || "שגיאה בעדכון הגדרות.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError("הסיסמאות החדשות אינן תואמות.");
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await authAPI.changePassword({ oldPassword, newPassword });
      setMessage("הסיסמה שונתה בהצלחה.");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(err?.data?.detail || "שגיאה בשינוי סיסמה.");
    } finally {
      setLoading(false);
    }
  };

  const requestProfileDeletion = (type) => {
    setConfirmDialog({
      title: "מחיקת פרופיל",
      message: `האם את/ה בטוח/ה שברצונך למחוק את פרופיל ה${type === "mentor" ? "מנחה" : "מתלמד"} שלך? פעולה זו לא ניתנת לביטול.`,
      onConfirm: () => handleDeleteProfile(type),
    });
  };

  const handleDeleteProfile = async (type) => {
    setConfirmDialog(null);
    setLoading(true);
    setMessage("");
    setError("");
    try {
      if (type === "mentor") {
        await profilesAPI.deleteMentorProfile();
      } else {
        await profilesAPI.deleteStudentProfile();
      }
      setMessage(`פרופיל ${type === "mentor" ? "מנחה" : "מתלמד"} נמחק בהצלחה.`);
      // Optional: Update user context to reflect missing profile
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError("שגיאה במחיקת פרופיל.");
    } finally {
      setLoading(false);
    }
  };

  const requestAccountDeletion = () => {
    setConfirmDialog({
      title: "מחיקת חשבון",
      message: "האם את/ה בטוח/ה שברצונך למחוק את החשבון לצמיתות? כל הפרופילים והנתונים שלך יימחקו ולא ניתן יהיה לשחזר אותם.",
      onConfirm: handleDeleteAccount,
    });
  };

  const handleDeleteAccount = async () => {
    setConfirmDialog(null);
    setLoading(true);
    try {
      await authAPI.deleteAccount();
      logout();
      navigate("/");
    } catch (err) {
      setError("שגיאה במחיקת חשבון.");
      setLoading(false);
    }
  };

  return (
    <div className="settings-container" dir="rtl">
      <div className="settings-card">
        <h1 className="settings-title">הגדרות חשבון</h1>

        {message && <div className="settings-msg success">{message}</div>}
        {error && <div className="settings-msg error">{error}</div>}

        <section className="settings-section">
          <h2>מצב תצוגה</h2>
          <div className="settings-theme-toggle">
            <span>מצב לילה:</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={toggleTheme}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>התראות</h2>
          <form onSubmit={handleUpdateEmailAndTopics} className="settings-form">
            <div className="form-group">
              <label>נושאים לקבלת התראות מחקר (מופרדים בפסיק)</label>
              <input
                type="text"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="למשל: רפואת ילדים, קרדיולוגיה"
              />
            </div>
            <button type="submit" className="settings-btn" disabled={loading}>
              שמור שינויים
            </button>
          </form>
        </section>

        <section className="settings-section">
          <h2>שינוי סיסמה</h2>
          <form onSubmit={handleChangePassword} className="settings-form">
            <div className="form-group">
              <label>סיסמה נוכחית</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>סיסמה חדשה</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>אימות סיסמה חדשה</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="settings-btn" disabled={loading}>
              שנה סיסמה
            </button>
          </form>
        </section>

        <section className="settings-section settings-danger-zone">
          <h2>אזור מסוכן</h2>
          
          <div className="danger-actions">
            {user?.has_mentor_profile && (
              <button
                type="button"
                className="settings-btn-danger outline"
                onClick={() => requestProfileDeletion("mentor")}
                disabled={loading}
              >
                מחק פרופיל מנחה
              </button>
            )}
            {user?.has_student_profile && (
              <button
                type="button"
                className="settings-btn-danger outline"
                onClick={() => requestProfileDeletion("student")}
                disabled={loading}
              >
                מחק פרופיל מתלמד
              </button>
            )}
            
            <button
              type="button"
              className="settings-btn-danger"
              onClick={requestAccountDeletion}
              disabled={loading}
            >
              מחק חשבון משתמש לצמיתות
            </button>
          </div>
        </section>

      </div>

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmText="כן, מחק"
          cancelText="ביטול"
        />
      )}
    </div>
  );
}
