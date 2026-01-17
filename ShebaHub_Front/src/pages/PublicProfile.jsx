import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { profilesAPI } from "../services/api";
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

const API_BASE_URL = "http://127.0.0.1:8000/api";

function PublicProfile() {
  const { id } = useParams();
  const profileId = id;
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        } catch (err) {
          // אם לא נמצא פרופיל מתלמד, ננסה מנטור
          try {
            profile = await profilesAPI.getMentor(profileId);
            if (isMounted && profile) {
              setProfileData({ ...profile, role: "mentor" });
            }
          } catch (mentorErr) {
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
      alert("הורדת המסמך נכשלה. אנא נסו שוב.");
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
            {profileData?.email && (
              <span className="profile-info-badge">{profileData.email}</span>
            )}
          </div>
        </div>
      </div>

      <div className="profile-wide-card">
        <h3 className="profile-section-title">פרטים מקצועיים</h3>
        <div className="profile-grid-content">
          <InfoRow label="מוסד לימודים" value={getHebrewName(profileData, "institution_detail")} />
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
            <InfoRow label="זמינות להתחלה" value={profileData.startDate || profileData.availableFrom || "-"} />
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

          {profileData.recommendationRequest && (
            <SectionCard title="ממליצים / חוות דעת">
              <p className="profile-bio-text">{profileData.recommendationRequest}</p>
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
    </div>
  );
}

export default PublicProfile;