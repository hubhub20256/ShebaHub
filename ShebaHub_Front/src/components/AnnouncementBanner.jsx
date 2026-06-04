import { useEffect, useState } from "react";
import { adminAPI } from "../services/api";

const PRIORITY_STYLES = {
  info: { background: "#ebf8ff", color: "#2b6cb0", borderColor: "#90cdf4" },
  warning: { background: "#fffff0", color: "#975a16", borderColor: "#fefcbf" },
  critical: { background: "#fff5f5", color: "#9b2c2c", borderColor: "#fed7d7" },
};

const DARK_PRIORITY_STYLES = {
  info: { background: "#1a365d", color: "#bee3f8", borderColor: "#2b6cb0" },
  warning: { background: "#5F370E", color: "#fefcbf", borderColor: "#975a16" },
  critical: { background: "#63171b", color: "#fed7d7", borderColor: "#9b2c2c" },
};

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    adminAPI
      .getActiveAnnouncements()
      .then(setAnnouncements)
      .catch(() => {});
  }, []);

  const dismiss = async (id) => {
    try {
      await adminAPI.dismissAnnouncement(id);
    } catch {
      // ignore
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  if (announcements.length === 0) return null;

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  return (
    <div style={{ direction: "rtl" }}>
      {announcements.map((a) => {
        const styles = isDark ? DARK_PRIORITY_STYLES[a.priority] : PRIORITY_STYLES[a.priority];
        return (
          <div
            key={a.id}
            className="announcement-banner"
            style={{
              ...styles,
              padding: "10px 16px",
              borderBottom: `2px solid ${styles?.borderColor || "#ccc"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: "0.9rem",
            }}
          >
            <div>
              <strong>{a.title}</strong>
              {a.body && <span style={{ marginRight: 8 }}>{a.body}</span>}
            </div>
            <button
              onClick={() => dismiss(a.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.1rem",
                color: styles?.color || "#333",
                padding: "0 4px",
                flexShrink: 0,
              }}
              aria-label="סגור"
            >
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
