import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { profilesAPI, researchAPI, messagesAPI, API_BASE_URL } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/Profile.css";

const THEME_COLOR = "#2C2C6C";

function extractDisplay(value) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const mapped = value
      .map((item) => extractDisplay(item))
      .filter((v) => v && v !== "-");
    return mapped.length ? mapped.join(", ") : "-";
  }
  if (typeof value === "object") {
    return value.name_he || value.name || value.label || value.value || "-";
  }
  return String(value);
}

function formatDate(isoDate) {
  if (!isoDate || isoDate === "-") return "-";
  if (isoDate.includes("/")) return isoDate;
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return isoDate;
}

function formatBoolean(val) {
  if (val === "כן" || val === true) return "כן";
  if (val === "לא" || val === false) return "לא";
  return "-";
}

function formatDegrees(profile) {
  if (Array.isArray(profile?.degrees) && profile.degrees.length) {
    return extractDisplay(profile.degrees);
  }
  if (Array.isArray(profile?.degrees_detail) && profile.degrees_detail.length) {
    return extractDisplay(profile.degrees_detail);
  }
  return "-";
}

function getHebrewName(obj, field) {
  const detail = obj?.[field];
  const fallbackKey = field?.replace("_detail", "");
  if (detail !== undefined) {
    const display = extractDisplay(detail);
    if (display && display !== "-") return display;
  }
  const fallback = obj?.[fallbackKey];
  const displayFallback = extractDisplay(fallback);
  return displayFallback || "-";
}

function SectionCard({ title, children }) {
  return (
    <div className="profile-card">
      <h3 className="profile-section-title">{title}</h3>
      <div className="profile-card-content">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-label">{label}:</span>
      <span className="profile-info-value">{value || "-"}</span>
    </div>
  );
}

function PublicProfile() {
  const { id } = useParams();
  const profileId = id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [myResearches, setMyResearches] = useState([]);
  const [selectedResearchId, setSelectedResearchId] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Contact modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  // Toast message state
  const [toast, setToast] = useState(null); // { type: "success" | "error", text: string }

  const currentUserIsMentor = user?.has_mentor_profile === true;
  const isOwnProfile = user && profileData && String(user.id) === String(profileData.userId);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!profileId) {
        setError("מזהה משתמש חסר");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // ניסיון לטעון פרופיל מתלמד
        let profile = null;
        try {
          profile = await profilesAPI.getStudent(profileId);
          if (isMounted && profile) {
            setProfileData({ ...profile, role: "apprentice" });
          }
        } catch {
          // אם לא נמצא פרופיל מתלמד, ננסה מנטור
          try {
            profile = await profilesAPI.getMentor(profileId);
            if (isMounted && profile) {
              setProfileData({ ...profile, role: "mentor" });
            }
          } catch {
            if (isMounted) {
              setError("לא נמצא פרופיל עבור משתמש זה");
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("שגיאה בטעינת הפרופיל");
          console.error("Error loading profile:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  // Load mentor's researches when invite modal opens
  useEffect(() => {
    if (!showInviteModal || !currentUserIsMentor) return;
    let cancelled = false;
    researchAPI.listMyResearches().then((data) => {
      if (!cancelled) setMyResearches(Array.isArray(data) ? data : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showInviteModal, currentUserIsMentor]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInvite = async () => {
    if (!selectedResearchId || !profileData?.userId) return;
    setInviteLoading(true);
    try {
      await researchAPI.inviteStudent(selectedResearchId, profileData.userId);
      showToast("success", "ההזמנה נשלחה בהצלחה!");
      setShowInviteModal(false);
      setSelectedResearchId("");
    } catch (err) {
      showToast("error", err?.data?.detail || "שגיאה בשליחת ההזמנה");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleContactSend = async () => {
    if (!contactSubject.trim() || !contactMessage.trim() || !profileData?.userId) return;
    setContactLoading(true);
    try {
      await messagesAPI.contactUser(profileData.userId, contactSubject, contactMessage);
      showToast("success", "ההודעה נשלחה בהצלחה!");
      setShowContactModal(false);
      setContactSubject("");
      setContactMessage("");
    } catch (err) {
      const errMsg = err?.data?.message || err?.data?.detail || "";
      const isEmailNotVerified =
        err?.status === 403 &&
        typeof errMsg === "string" &&
        errMsg.toLowerCase().includes("verify your email");
      showToast(
        "error",
        isEmailNotVerified
          ? "יש לאמת את כתובת האימייל לפני שליחת הודעה. בדוק/י את תיבת הדואר הנכנס."
          : errMsg || "שגיאה בשליחת ההודעה"
      );
    } finally {
      setContactLoading(false);
    }
  };

  async function downloadDocument(doc) {
    if (!doc?.id) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/profiles/documents/${doc.id}/download/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = doc.original_filename || doc.description || "document";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("download failed", err);
      showToast("error", "הורדת המסמך נכשלה. אנא נסו שוב.");
    }
  }

  if (isLoading) {
    return (
      <div dir="rtl" className="profile-page">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>טוען פרופיל...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div dir="rtl" className="profile-page">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>{error || "לא נמצא פרופיל"}</p>
          <button className="profile-edit-btn" onClick={() => navigate(-1)}>
            חזרה
          </button>
        </div>
      </div>
    );
  }

  const isMentor = profileData.role === "mentor";
  const isApprentice = profileData.role === "apprentice";

  const showApprenticeSpecialty = (() => {
    if (!isApprentice) return false;
    if (profileData.apprenticeStage === "סטודנט") {
      return profileData.yearOfStudy === "ו'" || profileData.yearOfStudy === "ז'";
    }
    return profileData.apprenticeStage !== "";
  })();

  const shouldShowSpecialty = isMentor || showApprenticeSpecialty;

  return (
    <div dir="rtl" className="profile-page">
      {toast && (
        <div className={`profile-toast profile-toast--${toast.type}`}>
          {toast.text}
          <button className="profile-toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "8px 16px",
            borderRadius: "12px",
            border: "1px solid #d8d8e5",
            background: "#f9f9ff",
            cursor: "pointer",
            fontWeight: 600,
            color: THEME_COLOR,
          }}
        >
          ← חזרה
        </button>
      </div>

      <div className="profile-header-card">
        <div className="profile-avatar">
          {(profileData?.avatarUrl || profileData?.avatar) ? (
            <img
              src={profileData.avatarUrl || profileData.avatar}
              alt="פרופיל"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
            />
          ) : (
            <>{(profileData?.name || " ")?.[0]}</>
          )}
        </div>
        <div className="profile-header-info">
          <h1 className="profile-name">{profileData?.name || "משתמש"}</h1>
          <div className="profile-badges-row">
            <span className={`profile-role-badge ${isMentor ? "mentor-badge" : "apprentice-badge"}`}>
              {isMentor ? "מנחה" : "מתלמד/ת"}
            </span>
            {profileData?.linkedinUrl && (
              <a
                href={profileData.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-info-badge"
                style={{ color: "#0077b5", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                🔗 LinkedIn
              </a>
            )}
            {currentUserIsMentor && !isOwnProfile && (
              (isApprentice && profileData.isAvailableForResearch === false) ? (
                <span className="profile-info-badge" style={{ color: "#999", marginRight: 8 }}>
                  לא זמין/ה למחקר
                </span>
              ) : (
                <button
                  className="profile-edit-btn"
                  onClick={() => setShowInviteModal(true)}
                  style={{ marginRight: 8 }}
                >
                  הזמן למחקר
                </button>
              )
            )}
            {user && !isOwnProfile && (
              <button
                className="profile-edit-btn"
                onClick={() => setShowContactModal(true)}
                style={{ marginRight: 8 }}
              >
                צור קשר
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-wide-card">
        <h3 className="profile-section-title">פרטים מקצועיים</h3>
        <div className="profile-grid-content">
          {isApprentice && <InfoRow label="מוסד לימודים" value={getHebrewName(profileData, "institution_detail")} />}
          <InfoRow label="תארים" value={formatDegrees(profileData)} />
          <InfoRow label="מקום עבודה" value={profileData.workplace || "-"} />

          {isMentor ? (
            <>
              <InfoRow label="שלב בהכשרה" value={getHebrewName(profileData, "academicRank_detail")} />
              <InfoRow label="ניסיון בהנחיה" value={formatBoolean(profileData.hasMentoringExperience)} />
            </>
          ) : (
            <>
              <InfoRow label="שלב נוכחי" value={getHebrewName(profileData, "apprenticeStage_detail")} />
              {(profileData.apprenticeStage === "סטודנט" || profileData.studyYear) && (
                <InfoRow label="שנת לימודים" value={profileData.yearOfStudy || profileData.studyYear || "-"} />
              )}
              <InfoRow label="עובד שיבא" value={formatBoolean(profileData.isShebaEmployee)} />
            </>
          )}

          {shouldShowSpecialty && (
            <>
              <InfoRow label="קטגוריית התמחות" value={getHebrewName(profileData, "specialtyGroup_detail")} />
              <InfoRow label="התמחות" value={getHebrewName(profileData, "specialty_detail")} />
            </>
          )}
        </div>
      </div>

      {isApprentice && (
        <div className="profile-wide-card">
          <h3 className="profile-section-title">העדפות מחקר וזמינות</h3>
          <div className="profile-grid-content">
            <InfoRow label="סוג עבודה" value={getHebrewName(profileData, "workType_detail")} />
            <InfoRow label="תגמול מועדף" value={getHebrewName(profileData, "compensationPreference_detail")} />
            <InfoRow label="שעות שבועיות" value={profileData.weeklyHours || "-"} />
            <InfoRow label="זמינות להתחלה" value={formatDate(profileData.startDate || profileData.availableFrom)} />
            <InfoRow label="כלים ומיומנויות" value={profileData.softwareSkills || "-"} />
          </div>
        </div>
      )}

      <div className="profile-bottom-grid">
        <div className="profile-column">
          <SectionCard title="אודות">
            <p className="profile-bio-text">
              {profileData.personalAcademicDescription || profileData.bio || "לא הוזן תיאור"}
            </p>
          </SectionCard>

          {Array.isArray(profileData.recommenders) && profileData.recommenders.length > 0 && (
            <SectionCard title="ממליצים">
              {profileData.recommenders.map((rec, idx) => (
                <div key={idx} style={{ marginBottom: idx < profileData.recommenders.length - 1 ? 12 : 0, paddingBottom: idx < profileData.recommenders.length - 1 ? 12 : 0, borderBottom: idx < profileData.recommenders.length - 1 ? "1px solid #eee" : "none" }}>
                  {profileData.recommenders.length > 1 && <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>ממליצ/ה {idx + 1}</span>}
                  {rec.name && (
                    <InfoRow label="שם" value={
                      rec.mentorId
                        ? <Link to={`/user/${rec.mentorId}`} style={{ color: THEME_COLOR, textDecoration: "underline", fontWeight: 600 }}>{rec.name}</Link>
                        : rec.name
                    } />
                  )}
                  {rec.email && <InfoRow label="אימייל" value={rec.email} />}
                  {rec.phone && <InfoRow label="טלפון" value={rec.phone} />}
                </div>
              ))}
              {profileData.documents && profileData.documents.filter(d => d.document_type === "RECOMMENDATION").length > 0 && (
                <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
                  <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 6 }}>מכתבי המלצה</span>
                  {profileData.documents.filter(d => d.document_type === "RECOMMENDATION").map((doc, i) => (
                    <div key={doc.id || i} className="profile-file-placeholder" style={{ marginBottom: 4 }}>
                      📄 {doc.original_filename || doc.description || `מכתב המלצה ${i + 1}`}
                      <span className="profile-download-link" onClick={() => downloadDocument(doc)} style={{ cursor: "pointer" }}>הורדה</span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          <SectionCard title="קבצים ומסמכים">
            {profileData.documents && profileData.documents.length > 0 ? (
              profileData.documents.map((doc, index) => (
                <div key={doc.id || index} className="profile-file-placeholder">
                  📄 {doc.original_filename || doc.description || `מסמך ${index + 1}`}
                  <span
                    className="profile-download-link"
                    onClick={() => downloadDocument(doc)}
                    style={{ cursor: "pointer" }}
                  >
                    הורדה
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: "#999", fontSize: "14px" }}>לא הועלו מסמכים</p>
            )}
          </SectionCard>
        </div>

        <div className="profile-column">
          {isMentor && (
            <>
              <SectionCard title="תחומי עניין ומחקר">
                <InfoRow label="תחומי עניין" value={getHebrewName(profileData, "researchInterests_detail")} />
              </SectionCard>
              {Array.isArray(profileData.activeResearches) && profileData.activeResearches.length > 0 && (
                <SectionCard title="מחקרים פעילים">
                  <div className="profile-research-list">
                    {profileData.activeResearches.map((r) => (
                      <Link
                        key={r.id}
                        to={`/research/${r.id}`}
                        className="profile-research-item"
                      >
                        <div className="profile-research-item-info">
                          <span className="profile-research-item-name">{r.researchName}</span>
                          {r.researchArea && (
                            <span className="profile-research-item-area">{r.researchArea}</span>
                          )}
                        </div>
                        <span className="profile-research-status-badge">
                          {r.status === "open" ? "פתוח" : r.status === "in_progress" ? "בתהליך" : r.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                </SectionCard>
              )}
              {profileData.previousResearchDescription && (
                <SectionCard title="מחקרים קודמים">
                  <p className="profile-bio-text">{profileData.previousResearchDescription}</p>
                </SectionCard>
              )}
              {profileData.mentoringExperienceDetails && (
                <SectionCard title="פירוט ניסיון בהנחיה">
                  <p className="profile-bio-text">{profileData.mentoringExperienceDetails}</p>
                </SectionCard>
              )}
            </>
          )}

          {isApprentice && profileData.professionalExperience && (
            <SectionCard title="ניסיון מקצועי קודם">
              <p className="profile-bio-text">{profileData.professionalExperience}</p>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Invite to Research Modal */}
      {showInviteModal && (
        <div className="invite-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="invite-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3>הזמנה למחקר</h3>
            <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
              בחר מחקר להזמין את {profileData?.name || "המתלמד/ת"} אליו:
            </p>
            {myResearches.length === 0 ? (
              <p style={{ color: "#999", fontSize: "0.875rem" }}>אין לך מחקרים פעילים</p>
            ) : (
              <select
                value={selectedResearchId}
                onChange={(e) => setSelectedResearchId(e.target.value)}
              >
                <option value="" disabled>בחר מחקר...</option>
                {myResearches.map((r) => (
                  <option key={r.id} value={r.id}>{r.researchName}</option>
                ))}
              </select>
            )}
            <div className="invite-modal-actions">
              <button
                className="invite-cancel-btn"
                onClick={() => setShowInviteModal(false)}
              >
                ביטול
              </button>
              <button
                className="invite-confirm-btn"
                onClick={handleInvite}
                disabled={!selectedResearchId || inviteLoading}
              >
                {inviteLoading ? "שולח..." : "שלח הזמנה"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact User Modal */}
      {showContactModal && (
        <div className="invite-modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="invite-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3>שליחת הודעה ל{profileData?.name || "משתמש"}</h3>
            <input
              type="text"
              placeholder="נושא"
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                border: "1px solid #d8d8e5",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                marginBottom: "0.75rem",
                boxSizing: "border-box",
              }}
            />
            <textarea
              placeholder="תוכן ההודעה"
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                border: "1px solid #d8d8e5",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                marginBottom: "1rem",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div className="invite-modal-actions">
              <button
                className="invite-cancel-btn"
                onClick={() => setShowContactModal(false)}
              >
                ביטול
              </button>
              <button
                className="invite-confirm-btn"
                onClick={handleContactSend}
                disabled={!contactSubject.trim() || !contactMessage.trim() || contactLoading}
              >
                {contactLoading ? "שולח..." : "שלח הודעה"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicProfile;