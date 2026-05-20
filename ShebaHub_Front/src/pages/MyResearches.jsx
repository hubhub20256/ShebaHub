import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import usePageTitle from "../hooks/usePageTitle";
import "../styles/MyResearches.css";

const STATUS_TABS = [
  { key: "all", label: "כל הבקשות" },
  { key: "pending", label: "ממתין" },
  { key: "approved", label: "אושר" },
  { key: "rejected", label: "נדחה" },
  { key: "invited", label: "הזמנות" },
];

const STATUS_LABELS = {
  pending: "ממתין",
  approved: "אושר",
  rejected: "נדחה",
  cancelled: "בוטל",
  invited: "הוזמנת",
};

const STATUS_COLORS = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
  cancelled: "#6b7280",
  invited: "#6366f1",
};

export default function MyResearches() {
  usePageTitle("המחקרים שלי");
  const { user } = useAuth();
  const { refreshCount } = useNotifications();
  const navigate = useNavigate();
  const isMentor = user?.has_mentor_profile === true;

  const [activeTab, setActiveTab] = useState("all");
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState(null);

  const [createdResearches, setCreatedResearches] = useState([]);
  const [createdLoading, setCreatedLoading] = useState(false);

  const [joinedResearches, setJoinedResearches] = useState([]);
  const [joinedLoading, setJoinedLoading] = useState(false);

  // Invitations state
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [invitationActionLoading, setInvitationActionLoading] = useState(null);

  // Reusable load functions
  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    setAppsError(null);
    try {
      const data = await researchAPI.listMyApplications(activeTab);
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setAppsError(err?.data?.detail || "שגיאה בטעינת הבקשות");
    } finally {
      setAppsLoading(false);
    }
  }, [activeTab]);

  const loadCreatedResearches = useCallback(async () => {
    if (!isMentor) return;
    setCreatedLoading(true);
    try {
      const data = await researchAPI.listMyResearches();
      setCreatedResearches(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail for created researches
    } finally {
      setCreatedLoading(false);
    }
  }, [isMentor]);

  const loadJoinedResearches = useCallback(async () => {
    setJoinedLoading(true);
    try {
      const data = await researchAPI.listJoinedResearches();
      setJoinedResearches(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail
    } finally {
      setJoinedLoading(false);
    }
  }, []);

  // Load user's applications
  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Load mentor's created researches
  useEffect(() => {
    loadCreatedResearches();
  }, [loadCreatedResearches]);

  // Load user's joined researches
  useEffect(() => {
    loadJoinedResearches();
  }, [loadJoinedResearches]);

  // Re-fetch data when page regains focus (throttled to once per 30s)
  const lastFocusRef = useRef(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRef.current < 30000) return;
      lastFocusRef.current = now;
      loadApplications();
      loadCreatedResearches();
      loadJoinedResearches();
      loadInvitations();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadApplications, loadCreatedResearches, loadJoinedResearches]);

  // Load invitations
  const loadInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const data = await researchAPI.listMyApplications("invited");
      setInvitations(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleInvitationAction = async (researchId, action) => {
    setInvitationActionLoading(researchId);
    try {
      if (action === "accept") {
        await researchAPI.acceptInvite(researchId);
      } else {
        await researchAPI.declineInvite(researchId);
      }
      await loadInvitations();
      // Reload applications list (accepting changes application status)
      loadApplications();
      refreshCount();
    } catch {
      // Silently fail
    } finally {
      setInvitationActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("he-IL");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="my-researches-page" dir="rtl">
      <div className="my-researches-header">
        <h1 className="my-researches-title">המחקרים שלי</h1>
        <div className="my-researches-underline"></div>
      </div>

      {/* Mentor: Created Researches Section */}
      {isMentor && (
        <div className="my-researches-section">
          <h2 className="my-researches-section-title">מחקרים שיצרתי</h2>
          {createdLoading ? (
            <p className="my-researches-loading">טוען...</p>
          ) : createdResearches.filter(r => r.ownerId == user?.id).length === 0 ? (
            <p className="my-researches-empty">עדיין לא יצרת מחקרים.</p>
          ) : (
            <div className="my-researches-grid">
              {createdResearches.filter(r => r.ownerId == user?.id).map((r) => (
                <div
                  key={r.id}
                  className="my-research-card my-research-card--created"
                  onClick={() => navigate(`/research/${r.id}`)}
                >
                  <div className="my-research-card-name">{r.researchName}</div>
                  {r.researchArea && (
                    <div className="my-research-card-area">{r.researchArea}</div>
                  )}
                  <div className="my-research-card-meta">
                    <span
                      className="my-research-status-badge"
                      style={{ backgroundColor: r.status === "open" ? "#10b981" : "#6b7280" }}
                    >
                      {r.status === "open" ? "פעיל" : r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Joined Researches Section */}
      <div className="my-researches-section">
        <h2 className="my-researches-section-title">מחקרים שהצטרפתי</h2>
        {joinedLoading ? (
          <p className="my-researches-loading">טוען...</p>
        ) : joinedResearches.filter(r => r.ownerId != user?.id).length === 0 ? (
          <p className="my-researches-empty">עדיין לא הצטרפת למחקרים.</p>
        ) : (
          <div className="my-researches-grid">
            {joinedResearches.filter(r => r.ownerId != user?.id).map((r) => (
              <div
                key={r.id}
                className="my-research-card my-research-card--created"
                onClick={() => navigate(`/research/${r.id}`)}
              >
                <div className="my-research-card-name">{r.researchName}</div>
                {r.researchArea && (
                  <div className="my-research-card-area">{r.researchArea}</div>
                )}
                <div className="my-research-card-meta">
                  <span
                    className="my-research-status-badge"
                    style={{ backgroundColor: r.status === "open" ? "#10b981" : "#6b7280" }}
                  >
                    {r.status === "open" ? "פעיל" : r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invitations Section */}
      <div className="my-researches-section">
        <h2 className="my-researches-section-title">הזמנות שקיבלתי</h2>
        {invitationsLoading ? (
          <p className="my-researches-loading">טוען...</p>
        ) : invitations.length === 0 ? (
          <p className="my-researches-empty">אין הזמנות ממתינות.</p>
        ) : (
          <div className="my-researches-grid">
            {invitations.map((app) => (
              <div
                key={app.id}
                className="my-research-card my-research-card--invited"
              >
                <div className="my-research-card-name">
                  {app.research?.researchName || "מחקר"}
                </div>
                {app.research?.researchArea && (
                  <div className="my-research-card-area">{app.research.researchArea}</div>
                )}
                <div className="my-research-card-meta">
                  <span
                    className="my-research-status-badge"
                    style={{ backgroundColor: STATUS_COLORS.invited }}
                  >
                    {STATUS_LABELS.invited}
                  </span>
                  <span className="my-research-card-date">
                    התקבלה: {formatDate(app.created_at)}
                  </span>
                </div>
                <div className="my-research-card-actions">
                  <button
                    className="my-research-action-btn my-research-action-btn--accept"
                    disabled={invitationActionLoading === app.research?.id}
                    onClick={() => handleInvitationAction(app.research?.id, "accept")}
                  >
                    {invitationActionLoading === app.research?.id ? "..." : "קבל הזמנה"}
                  </button>
                  <button
                    className="my-research-action-btn my-research-action-btn--decline"
                    disabled={invitationActionLoading === app.research?.id}
                    onClick={() => handleInvitationAction(app.research?.id, "decline")}
                  >
                    דחה
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applications Section */}
      <div className="my-researches-section">
        <h2 className="my-researches-section-title">בקשות שהגשתי</h2>

        {/* Tab Bar */}
        <div className="my-researches-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`my-researches-tab ${activeTab === tab.key ? "my-researches-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {appsLoading ? (
          <p className="my-researches-loading">טוען...</p>
        ) : appsError ? (
          <p className="my-researches-error">{appsError}</p>
        ) : applications.length === 0 ? (
          <p className="my-researches-empty">
            {activeTab === "all"
              ? "עדיין לא הגשת בקשות למחקרים."
              : `אין בקשות בסטטוס "${STATUS_TABS.find((t) => t.key === activeTab)?.label}".`}
          </p>
        ) : (
          <div className="my-researches-grid">
            {applications.map((app) => (
              <div
                key={app.id}
                className="my-research-card"
                onClick={() => app.research?.id && navigate(`/research/${app.research.id}`)}
              >
                <div className="my-research-card-name">
                  {app.research?.researchName || "מחקר"}
                </div>
                {app.research?.researchArea && (
                  <div className="my-research-card-area">{app.research.researchArea}</div>
                )}
                <div className="my-research-card-meta">
                  <span
                    className="my-research-status-badge"
                    style={{ backgroundColor: STATUS_COLORS[app.status] || "#6b7280" }}
                  >
                    {STATUS_LABELS[app.status] || app.status}
                  </span>
                  <span className="my-research-card-date">
                    הוגש: {formatDate(app.created_at)}
                  </span>
                </div>
                {app.mentor_note && (
                  <div className="my-research-card-note">
                    <strong>הערת מנחה:</strong> {app.mentor_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
