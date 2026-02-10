import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profilesAPI } from "../services/api";
import PublicProfile from "./PublicProfile";
import {
  SPECIALTIES_BASE,
  SPECIALTIES_SUPER,
  SPECIALTIES_FELLOWSHIPS,
} from "../data/specialties";
import "../styles/Profile.css";

const SPECIALTY_GROUPS = [
  { v: "", t: "בחרי/י קטגוריה" },
  { v: "מקצועות הבסיס", t: "מקצועות הבסיס" },
  { v: "מקצועות העל", t: "מקצועות העל" },
  { v: "השתלמויות עמיתים", t: "השתלמויות עמיתים" },
];

const specialtiesByGroup = {
  "מקצועות הבסיס": SPECIALTIES_BASE,
  "מקצועות העל": SPECIALTIES_SUPER,
  "השתלמויות עמיתים": SPECIALTIES_FELLOWSHIPS,
};

const currentYear = new Date().getFullYear();
const START_YEARS = Array.from({ length: 11 }, (_, i) => ({
  v: (currentYear - i).toString(),
  t: (currentYear - i).toString(),
}));

// Keep degrees list tight (matches current UX expectations)
const DEGREE_OPTIONS = ["MD", "PhD", "MSc", "MPH", "MBA"];

function sanitizeDegrees(value) {
  const degrees = Array.isArray(value) ? value : [];
  return degrees.filter((d) => DEGREE_OPTIONS.includes(d));
}

const ACADEMIC_RANKS = [
  { v: "", t: "בחר שלב" },
  { v: "סטז'ר", t: "סטז'ר" },
  { v: "מתמחה", t: "מתמחה" },
  { v: "בכיר", t: "בכיר" },
  { v: "מרצה", t: "מרצה" },
  { v: "פרופסור", t: "פרופסור" },
];

const APPRENTICE_STAGES = [
  { v: "", t: "בחר שלב" },
  { v: "סטודנט", t: "סטודנט" },
  { v: "סטז'ר", t: "סטז'ר" },
  { v: "מתמחה", t: "מתמחה" },
  { v: "בוגר", t: "בוגר" },
];

const RESEARCH_INTERESTS = [
  { v: "", t: "בחר תחום" },
  { v: "קליני", t: "קליני" },
  { v: "מדעי יסוד", t: "מדעי יסוד" },
  { v: "דאטה", t: "Data/AI" },
  { v: "אפידמיולוגיה", t: "אפידמיולוגיה" },
];

const INSTITUTIONS = [
  { v: "", t: "בחר מוסד" },
  { v: "אוניברסיטת תל אביב", t: "אוניברסיטת תל אביב" },
  { v: "אוניברסיטה עברית", t: "אוניברסיטה עברית" },
  { v: "טכניון", t: "טכניון" },
  { v: "אוניברסיטת בן גוריון", t: "אוניברסיטת בן גוריון" },
  { v: "אחר", t: "מוסד אחר" },
];

const WORK_TYPES = [
  { v: "", t: "בחר סוג" },
  { v: "מלא", t: "משרה מלאה" },
  { v: "חלקי", t: "משרה חלקית" },
  { v: "פרויקט", t: "פרויקט" },
];

const COMPENSATION_PREFERENCES = [
  { v: "", t: "בחר העדפה" },
  { v: "שכר", t: "שכר" },
  { v: "מלגה", t: "מלגה" },
  { v: "התנדבות", t: "התנדבות" },
];

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function getSpecialtyOptions(selectedGroup) {
  const list = specialtiesByGroup[selectedGroup] || [];
  return [{ v: "", t: selectedGroup ? "בחרי/י התמחות" : "קודם בחרי/י קטגוריה" }, ...list.map((s) => ({ v: s, t: s }))];
}

function formatBoolean(val) {
  if (val === "כן" || val === true) return "כן";
  if (val === "לא" || val === false) return "לא";
  return "-";
}

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

function isYes(value) {
  return value === true || value === "כן" || value === "yes" || value === "true";
}

function toYesNo(value) {
  if (value === true) return "כן";
  if (value === false) return "לא";
  if (value === "כן" || value === "לא") return value;
  return value ?? "";
}

function normalizeProfileForDraft(profile) {
  if (!profile) return { ...INITIAL_DRAFT };

  const degreesFromDetail = Array.isArray(profile.degrees_detail)
    ? profile.degrees_detail.map((d) => extractDisplay(d)).filter((x) => x && x !== "-")
    : [];

  const degreesFromField = Array.isArray(profile.degrees)
    ? profile.degrees.map((d) => extractDisplay(d)).filter((x) => x && x !== "-")
    : [];

  return {
    ...profile,
    // Normalize degrees to string list for toggles + backend conversion
    degrees: sanitizeDegrees(degreesFromField.length ? degreesFromField : degreesFromDetail),

    // Normalize Hebrew yes/no fields that may arrive as booleans
    hasMentoringExperience: toYesNo(profile.hasMentoringExperience),
    isShebaEmployee: toYesNo(profile.isShebaEmployee),
    hasResearchExperience: toYesNo(profile.hasResearchExperience),
    isAvailableForResearch: toYesNo(profile.isAvailableForResearch),

    // Ensure reference fields aren't objects in the draft
    institution: typeof profile.institution === "object" ? extractDisplay(profile.institution) : (profile.institution || extractDisplay(profile.institution_detail) || ""),
    academicRank: typeof profile.academicRank === "object" ? extractDisplay(profile.academicRank) : (profile.academicRank || extractDisplay(profile.academicRank_detail) || ""),
    specialtyGroup: typeof profile.specialtyGroup === "object" ? extractDisplay(profile.specialtyGroup) : (profile.specialtyGroup || extractDisplay(profile.specialtyGroup_detail) || ""),
    specialty: typeof profile.specialty === "object" ? extractDisplay(profile.specialty) : (profile.specialty || extractDisplay(profile.specialty_detail) || ""),
    researchInterests: typeof profile.researchInterests === "object" ? extractDisplay(profile.researchInterests) : (profile.researchInterests || extractDisplay(profile.researchInterests_detail) || ""),
  };
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

const THEME_COLOR = "#2C2C6C";
const ACCENT_PINK = "#ef67a0";
const ACCENT_TEAL = "#6CD5BF";

const styles = {
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "white", padding: "2rem", borderRadius: "1rem", width: "95%", maxWidth: "720px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.5rem", color: THEME_COLOR, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: "10px" },
  formSection: { marginBottom: "16px" },
  label: { display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: THEME_COLOR },
  input: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box", outlineColor: ACCENT_TEAL },
  textarea: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outlineColor: ACCENT_TEAL },
  select: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box", outlineColor: ACCENT_TEAL, backgroundColor: "white", cursor: "pointer" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  primaryBtn: { padding: "10px 20px", borderRadius: "20px", background: THEME_COLOR, color: "white", border: "none", cursor: "pointer", fontWeight: "600", transition: "opacity 0.2s" },
  secondaryBtn: { padding: "10px 20px", borderRadius: "20px", background: "white", color: "#666", border: "1px solid #ddd", cursor: "pointer", fontWeight: "600" },
  pillRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  pillBtn: { padding: "8px 16px", borderRadius: "20px", border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: "14px", transition: "all 0.2s" },
  pillBtnActive: { background: ACCENT_TEAL, color: "white", borderColor: ACCENT_TEAL },
};

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

const INITIAL_DRAFT = {
  specialtyGroup: "",
  specialty: "",
  institution: "",
  degrees: [],
  academicRank: "",
  workplace: "",
  hasMentoringExperience: "",
  mentoringExperienceDetails: "",
  researchInterests: "",
  previousResearchDescription: "",
  apprenticeStage: "",
  yearOfStudy: "",
  startYear: "",
  isShebaEmployee: "",
  hasResearchExperience: "",
  researchExperienceDetails: "",
  workType: "",
  compensationPreference: "",
  participationMode: "",
  isAvailableForResearch: "",
  weeklyHours: "",
  startDate: "",
  softwareSkills: "",
  professionalExperience: "",
  personalAcademicDescription: "",
  recommendationRequest: "",
};

function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mentorProfile, setMentorProfile] = useState(null);
  const [apprenticeProfile, setApprenticeProfile] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullEditing, setIsFullEditing] = useState(false);
  const [draft, setDraft] = useState(INITIAL_DRAFT);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarInitialUrl, setAvatarInitialUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const avatarFileInputRef = useRef(null);
  const documentFileInputRef = useRef(null);
  const avatarObjectUrlRef = useRef(null);

  const isMeAlias = id === "me";
  const isOwnProfile = !!user && (isMeAlias || id === user.id);

  // If token/user is gone (logout / expired), redirect to login
  useEffect(() => {
    if (!isOwnProfile) return;
    // If user exists but token was cleared/expired, force logout UI state
    const token = localStorage.getItem('accessToken');
    if (!token) {
      navigate('/login');
    }
  }, [isOwnProfile, navigate]);

  useEffect(() => {
    let isMounted = true;
    async function loadProfiles() {
      if (!isOwnProfile) {
        if (isMounted) setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // If not authenticated, don't fetch protected profile data
        if (!localStorage.getItem('accessToken')) {
          setMentorProfile(null);
          setApprenticeProfile(null);
          setActiveRole(null);
          setUserData(null);
          return;
        }
        const [mentor, apprentice] = await Promise.allSettled([
          profilesAPI.getMyMentorProfile(),
          profilesAPI.getMyStudentProfile(),
        ]);

        const mentorData = mentor.status === "fulfilled" ? mentor.value : null;
        const apprenticeData = apprentice.status === "fulfilled" ? apprentice.value : null;

        if (!isMounted) return;

        setMentorProfile(mentorData);
        setApprenticeProfile(apprenticeData);
        const role = mentorData ? "mentor" : apprenticeData ? "apprentice" : null;
        setActiveRole(role);
        setUserData(role === "mentor" ? mentorData : apprenticeData);
      } catch (err) {
        console.error("Failed loading profiles", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadProfiles();
    return () => {
      isMounted = false;
    };
  }, [isOwnProfile]);

  const hasMentorProfile = useMemo(() => Boolean(mentorProfile), [mentorProfile]);
  const hasApprenticeProfile = useMemo(() => Boolean(apprenticeProfile), [apprenticeProfile]);
  const isMentor = activeRole === "mentor";
  const isApprentice = activeRole === "apprentice";
  const hasProfile = isMentor || isApprentice;

  const showApprenticeSpecialty = useMemo(() => {
    if (!userData || !isApprentice) return false;
    if (userData.apprenticeStage === "סטודנט") {
      return userData.yearOfStudy === "ו'" || userData.yearOfStudy === "ז'";
    }
    return userData.apprenticeStage !== "";
  }, [userData, isApprentice]);

  // ALL function definitions - these don't violate hooks rules
  function handleToggleClick() {
    if (hasMentorProfile && hasApprenticeProfile) {
      const next = activeRole === "mentor" ? apprenticeProfile : mentorProfile;
      setActiveRole(activeRole === "mentor" ? "apprentice" : "mentor");
      setUserData(next);
      return;
    }

    if (!hasMentorProfile) {
      navigate("/create-profile?role=mentor");
      return;
    }
    if (!hasApprenticeProfile) {
      navigate("/create-profile?role=apprentice");
    }
  }

  function openFullEdit() {
    if (!userData) return;
    const normalized = normalizeProfileForDraft(userData);
    setDraft({ ...INITIAL_DRAFT, ...normalized, degrees: sanitizeDegrees(normalized.degrees) });

    const existingAvatar = userData?.avatarUrl || userData?.avatar || "";
    setAvatarInitialUrl(existingAvatar);
    setAvatarPreviewUrl(existingAvatar);
    setRemoveAvatar(false);

    setAvatarFile(null);
    setDocumentFile(null);
    setIsFullEditing(true);
  }

  function closeFullEdit() {
    setIsFullEditing(false);
    setDraft(INITIAL_DRAFT);
    setAvatarFile(null);
    setRemoveAvatar(false);
    setAvatarInitialUrl("");
    setAvatarPreviewUrl("");
    setDocumentFile(null);

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
  }

  function handleAvatarFileChange(file) {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    setAvatarFile(file || null);
    setRemoveAvatar(false);

    if (file) {
      const url = URL.createObjectURL(file);
      avatarObjectUrlRef.current = url;
      setAvatarPreviewUrl(url);
    } else {
      setAvatarPreviewUrl(avatarInitialUrl || "");
    }
  }

  function handleRemoveAvatar() {
    handleAvatarFileChange(null);
    setRemoveAvatar(true);
    setAvatarPreviewUrl("");
  }

  function handleCancelAvatarChanges() {
    handleAvatarFileChange(null);
    setRemoveAvatar(false);
    setAvatarPreviewUrl(avatarInitialUrl || "");
  }

  function handleFieldChange(name, value) {
    setDraft((prev) => ({ ...prev, [name]: value }));
  }

  function toggleDegree(deg) {
    setDraft((prev) => {
      const current = Array.isArray(prev.degrees) ? prev.degrees : [];
      const exists = current.includes(deg);
      const next = exists ? current.filter((d) => d !== deg) : [...current, deg];
      return { ...prev, degrees: sanitizeDegrees(next) };
    });
  }

  async function deleteExistingDocument(doc) {
    if (!doc?.id) return;
    if (!activeRole) return;
    const name = doc.original_filename || doc.description || "מסמך";
    const ok = window.confirm(`למחוק את המסמך "${name}"?`);
    if (!ok) return;

    try {
      await profilesAPI.deleteDocument(doc.id, activeRole);
      const nextDocs = Array.isArray(userData?.documents)
        ? userData.documents.filter((d) => d?.id !== doc.id)
        : [];

      setUserData((prev) => ({ ...prev, documents: nextDocs }));
      if (activeRole === "mentor") {
        setMentorProfile((prev) => (prev ? { ...prev, documents: nextDocs } : prev));
      } else {
        setApprenticeProfile((prev) => (prev ? { ...prev, documents: nextDocs } : prev));
      }
    } catch (err) {
      console.error("Document delete failed", err);
      alert("מחיקת המסמך נכשלה. נסו שוב.");
    }
  }

  function isSpecialtyRelevant() {
    if (!isApprentice) return true;
    if (draft.apprenticeStage === "סטודנט") {
      return draft.yearOfStudy === "ו'" || draft.yearOfStudy === "ז'";
    }
    return draft.apprenticeStage !== "";
  }

  async function saveFullEdit() {
    if (!activeRole) return;
    setIsSaving(true);
    try {
      const profileType = activeRole;
      const updateFn = profileType === "mentor" ? profilesAPI.updateMentorProfile : profilesAPI.updateStudentProfile;
      let updatedProfile = await updateFn(draft);

      if (removeAvatar) {
        try {
          await profilesAPI.deleteAvatar(profileType);
          updatedProfile = { ...updatedProfile, avatarUrl: null, avatar: null };
        } catch (err) {
          console.error("Avatar delete failed", err);
          alert("הפרופיל נשמר, אבל הסרת התמונה נכשלה. ניתן לנסות שוב מאוחר יותר.");
        }
      }

      if (avatarFile) {
        const avatarResult = await profilesAPI.uploadAvatar(avatarFile, profileType);
        updatedProfile = { ...updatedProfile, avatarUrl: avatarResult.avatarUrl || avatarResult.avatar };
      }

      if (documentFile) {
        try {
          const uploadedDoc = await profilesAPI.uploadDocument(documentFile, profileType, "OTHER", documentFile.name || "document");
          const nextDocs = Array.isArray(updatedProfile?.documents)
            ? [...updatedProfile.documents, uploadedDoc]
            : [uploadedDoc];
          updatedProfile = { ...updatedProfile, documents: nextDocs };
        } catch (err) {
          console.error("Document upload failed", err);
          alert("הפרופיל נשמר, אבל המסמך לא הועלה. ניתן לנסות שוב מאוחר יותר.");
        }
      }

      if (profileType === "mentor") {
        setMentorProfile(updatedProfile);
      } else {
        setApprenticeProfile(updatedProfile);
      }
      setUserData(updatedProfile);
      alert("הפרופיל עודכן בהצלחה!");
      closeFullEdit();
    } catch (err) {
      console.error("Error updating profile", err);
      const msg = err?.data?.detail || err?.data || "שגיאה בעדכון הפרופיל";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setIsSaving(false);
    }
  }

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

  // Computed values that depend on hooks (but don't use hooks themselves)
  const shouldShowSpecialty = isMentor || showApprenticeSpecialty;
  const toggleLabel = (() => {
    if (hasMentorProfile && hasApprenticeProfile) return `🔄 החלף תצוגה (${isMentor ? "מנחה" : "מתלמד/ת"})`;
    if (hasApprenticeProfile && !hasMentorProfile) return "🔄 צור פרופיל מנחה";
    if (hasMentorProfile && !hasApprenticeProfile) return "🔄 צור פרופיל מתלמד/ת";
    return "🔄 צור פרופיל";
  })();

  // NOW we can do conditional rendering - all hooks have been called
  // Public profile view (read-only). This prevents non-owners from even seeing edit UI.
  if (!isOwnProfile && !isMeAlias) {
    return <PublicProfile />;
  }

  // /user/me requires login
  if (isMeAlias && !user) {
    return (
      <div dir="rtl" className="profile-page">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>יש להתחבר כדי לצפות בפרופיל</p>
          <button className="profile-edit-btn" onClick={() => navigate("/login")}>התחברות</button>
          <span style={{ margin: "0 8px" }} />
          <button className="profile-edit-btn" onClick={() => navigate("/register")}>הרשמה</button>
        </div>
      </div>
    );
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

  if (!user) {
    return (
      <div dir="rtl" className="profile-page">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>יש להתחבר כדי לצפות בפרופיל</p>
          <button className="profile-edit-btn" onClick={() => navigate("/login")}>התחברות</button>
          <span style={{ margin: "0 8px" }} />
          <button className="profile-edit-btn" onClick={() => navigate("/register")}>הרשמה</button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div dir="rtl" className="profile-page">
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>לא נמצא פרופיל. ניתן ליצור פרופיל חדש.</p>
          <button className="profile-edit-btn" onClick={() => navigate("/create-profile")}>צור פרופיל</button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="profile-page">
      <div style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "12px" }}>
        <button
          onClick={handleToggleClick}
          className="profile-toggle-btn"
          style={{
            border: "1px solid #d8d8e5",
            padding: "6px 12px",
            borderRadius: "12px",
            background: "#f9f9ff",
            cursor: "pointer",
            fontWeight: 600,
            color: "#1f1f4d",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            fontSize: "12px",
          }}
        >
          {toggleLabel}
        </button>
      </div>

      <div className="profile-header-card">
        <div className="profile-avatar">
          {(userData?.avatarUrl || userData?.avatar) ? (
            <img src={userData.avatarUrl || userData.avatar} alt="פרופיל" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : (
            <>{(user?.firstName || " ")?.[0]}{(user?.lastName || " ")?.[0]}</>
          )}
        </div>
        <div className="profile-header-info">
          <h1 className="profile-name">{user?.firstName || ""} {user?.lastName || ""}</h1>
          <div className="profile-badges-row">
            {hasProfile && (
              <span className={`profile-role-badge ${isMentor ? "mentor-badge" : "apprentice-badge"}`}>
                {isMentor ? "מנחה" : "מתלמד/ת"}
              </span>
            )}
            <span className="profile-info-badge">{user?.email || ""}</span>
          </div>
        </div>
        <button className="profile-edit-btn" onClick={openFullEdit}>עריכת פרופיל</button>
      </div>

      {!hasProfile && (
        <div className="profile-wide-card">
          <div style={{ textAlign: "center", padding: "30px" }}>
            <p style={{ marginBottom: "15px" }}>עדיין לא יצרת פרופיל</p>
            <a href="/create-profile" style={{ color: "#2C2C6C", fontWeight: "bold" }}>
              ליצירת פרופיל לחץ כאן
            </a>
          </div>
        </div>
      )}

      {hasProfile && (
        <div className="profile-wide-card">
          <h3 className="profile-section-title">פרטים מקצועיים</h3>
          <div className="profile-grid-content">
            <InfoRow label="מוסד לימודים" value={getHebrewName(userData, "institution_detail")} />
            <InfoRow label="תארים" value={formatDegrees(userData)} />
            <InfoRow label="מקום עבודה" value={userData.workplace || "-"} />

            {isMentor ? (
              <>
                <InfoRow label="שלב בהכשרה" value={getHebrewName(userData, "academicRank_detail")} />
                <InfoRow label="ניסיון בהנחיה" value={formatBoolean(userData.hasMentoringExperience)} />
              </>
            ) : (
              <>
                <InfoRow label="שלב נוכחי" value={getHebrewName(userData, "apprenticeStage_detail")} />
                {(userData.apprenticeStage === "סטודנט" || userData.studyYear) && (
                  <InfoRow label="שנת לימודים" value={userData.yearOfStudy || userData.studyYear || "-"} />
                )}
                <InfoRow label="עובד שיבא" value={formatBoolean(userData.isShebaEmployee)} />
              </>
            )}

            {shouldShowSpecialty && (
              <>
                <InfoRow label="קטגוריית התמחות" value={getHebrewName(userData, "specialtyGroup_detail")} />
                <InfoRow label="התמחות" value={getHebrewName(userData, "specialty_detail")} />
              </>
            )}
          </div>
        </div>
      )}

      {isApprentice && (
        <div className="profile-wide-card">
          <h3 className="profile-section-title">העדפות מחקר וזמינות</h3>
          <div className="profile-grid-content">
            <InfoRow label="סוג עבודה" value={getHebrewName(userData, "workType_detail")} />
            <InfoRow label="תגמול מועדף" value={getHebrewName(userData, "compensationPreference_detail")} />
            <InfoRow label="שעות שבועיות" value={userData.weeklyHours || "-"} />
            <InfoRow label="זמינות להתחלה" value={userData.startDate || userData.availableFrom || "-"} />
            <InfoRow label="כלים ומיומנויות" value={userData.softwareSkills || "-"} />
          </div>
        </div>
      )}

      {hasProfile && (
        <div className="profile-bottom-grid">
          <div className="profile-column">
            <SectionCard title="אודות">
              <p className="profile-bio-text">{userData.personalAcademicDescription || userData.bio || "לא הוזן תיאור"}</p>
            </SectionCard>

            {userData.recommendationRequest && (
              <SectionCard title="ממליצים / חוות דעת">
                <p className="profile-bio-text">{userData.recommendationRequest}</p>
              </SectionCard>
            )}

            <SectionCard title="קבצים ומסמכים">
              {userData.documents && userData.documents.length > 0 ? (
                userData.documents.map((doc, index) => (
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
                  <InfoRow label="תחומי עניין" value={getHebrewName(userData, "researchInterests_detail")} />
                </SectionCard>
                {userData.previousResearchDescription && (
                  <SectionCard title="מחקרים קודמים">
                    <p className="profile-bio-text">{userData.previousResearchDescription}</p>
                  </SectionCard>
                )}
                {userData.mentoringExperienceDetails && (
                  <SectionCard title="פירוט ניסיון בהנחיה">
                    <p className="profile-bio-text">{userData.mentoringExperienceDetails}</p>
                  </SectionCard>
                )}
              </>
            )}

            {isApprentice && userData.professionalExperience && (
              <SectionCard title="ניסיון מקצועי קודם">
                <p className="profile-bio-text">{userData.professionalExperience}</p>
              </SectionCard>
            )}
          </div>
        </div>
      )}

      {isFullEditing && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>עריכת פרופיל</h2>

            <div style={styles.formSection}>
              <label style={styles.label}>תמונת פרופיל</label>
              <input
                ref={avatarFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarFileChange(e.target.files?.[0] || null)}
                style={{ display: "none" }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "#f2f2f7",
                    border: "1px solid #e3e3ee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flex: "0 0 auto",
                    color: "#2C2C6C",
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="avatar preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <>{(user?.firstName || " ")?.[0]}{(user?.lastName || " ")?.[0]}</>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    style={{ ...styles.secondaryBtn, borderRadius: 12 }}
                  >
                    החלפת תמונה
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={!avatarInitialUrl && !avatarFile}
                    style={{
                      ...styles.secondaryBtn,
                      borderRadius: 12,
                      opacity: (!avatarInitialUrl && !avatarFile) ? 0.5 : 1,
                    }}
                  >
                    הסרת תמונה
                  </button>

                  {(avatarFile || removeAvatar) && (
                    <button
                      type="button"
                      onClick={handleCancelAvatarChanges}
                      style={{ ...styles.secondaryBtn, borderRadius: 12 }}
                    >
                      ביטול שינוי
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>קטגוריית התמחות</label>
              <select
                value={draft.specialtyGroup}
                onChange={(e) => handleFieldChange("specialtyGroup", e.target.value)}
                style={styles.select}
              >
                {SPECIALTY_GROUPS.map((opt) => (
                  <option key={opt.v} value={opt.v}>{opt.t}</option>
                ))}
              </select>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>התמחות / תחום מרכזי</label>
              <select
                value={draft.specialty}
                onChange={(e) => handleFieldChange("specialty", e.target.value)}
                style={styles.select}
                disabled={!draft.specialtyGroup}
              >
                {getSpecialtyOptions(draft.specialtyGroup).map((opt) => (
                  <option key={opt.v} value={opt.v}>{opt.t}</option>
                ))}
              </select>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>מוסד לימודים</label>
              <select
                value={draft.institution}
                onChange={(e) => handleFieldChange("institution", e.target.value)}
                style={styles.select}
              >
                {INSTITUTIONS.map((opt) => (
                  <option key={opt.v} value={opt.v}>{opt.t}</option>
                ))}
              </select>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>תארים</label>
              <div style={styles.pillRow}>
                {DEGREE_OPTIONS.map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => toggleDegree(deg)}
                    style={{
                      ...styles.pillBtn,
                      ...(Array.isArray(draft.degrees) && draft.degrees.includes(deg) ? styles.pillBtnActive : {}),
                    }}
                  >
                    {deg}
                  </button>
                ))}
              </div>
            </div>

            {isMentor && (
              <>
                <div style={styles.formSection}>
                  <label style={styles.label}>שלב בהכשרה הרפואית</label>
                  <select
                    value={draft.academicRank}
                    onChange={(e) => handleFieldChange("academicRank", e.target.value)}
                    style={styles.select}
                  >
                    {ACADEMIC_RANKS.map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>מקום עבודה</label>
                  <input
                    type="text"
                    value={draft.workplace || ""}
                    onChange={(e) => handleFieldChange("workplace", e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>ניסיון בהנחיה</label>
                  <div style={styles.pillRow}>
                    {["כן", "לא"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleFieldChange("hasMentoringExperience", opt)}
                        style={{
                          ...styles.pillBtn,
                          ...(toYesNo(draft.hasMentoringExperience) === opt ? styles.pillBtnActive : {}),
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>פירוט ניסיון בהנחיה</label>
                  <textarea
                    value={draft.mentoringExperienceDetails || ""}
                    onChange={(e) => handleFieldChange("mentoringExperienceDetails", e.target.value)}
                    style={styles.textarea}
                    rows={3}
                    placeholder={isYes(draft.hasMentoringExperience) ? "ספר/י בקצרה על ניסיון ההנחיה שלך" : "אופציונלי"}
                  />
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>תחום עניין מחקרי</label>
                  <select
                    value={draft.researchInterests}
                    onChange={(e) => handleFieldChange("researchInterests", e.target.value)}
                    style={styles.select}
                  >
                    {RESEARCH_INTERESTS.map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>מחקרים קודמים</label>
                  <textarea
                    value={draft.previousResearchDescription || ""}
                    onChange={(e) => handleFieldChange("previousResearchDescription", e.target.value)}
                    style={styles.textarea}
                    rows={3}
                  />
                </div>
              </>
            )}

            {isApprentice && (
              <>
                <div style={styles.formSection}>
                  <label style={styles.label}>שלב בהכשרה רפואית</label>
                  <select
                    value={draft.apprenticeStage}
                    onChange={(e) => handleFieldChange("apprenticeStage", e.target.value)}
                    style={styles.select}
                  >
                    {APPRENTICE_STAGES.map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                </div>

                {draft.apprenticeStage === "סטודנט" && (
                  <div style={styles.formSection}>
                    <label style={styles.label}>שנת לימודים</label>
                    <div style={styles.pillRow}>
                      {["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'"]?.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => handleFieldChange("yearOfStudy", y)}
                          style={{
                            ...styles.pillBtn,
                            ...(draft.yearOfStudy === y ? styles.pillBtnActive : {}),
                          }}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={styles.formSection}>
                  <label style={styles.label}>שנת תחילת לימודים</label>
                  <select
                    value={draft.startYear}
                    onChange={(e) => handleFieldChange("startYear", e.target.value)}
                    style={styles.select}
                  >
                    {[{ v: "", t: "בחר שנה" }, ...START_YEARS].map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                </div>

                {isSpecialtyRelevant() && (
                  <>
                    <div style={styles.formSection}>
                      <label style={styles.label}>קטגוריית התמחות</label>
                      <select
                        value={draft.specialtyGroup}
                        onChange={(e) => handleFieldChange("specialtyGroup", e.target.value)}
                        style={styles.select}
                      >
                        {SPECIALTY_GROUPS.map((opt) => (
                          <option key={opt.v} value={opt.v}>{opt.t}</option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formSection}>
                      <label style={styles.label}>התמחות / תחום מרכזי</label>
                      <select
                        value={draft.specialty}
                        onChange={(e) => handleFieldChange("specialty", e.target.value)}
                        style={styles.select}
                        disabled={!draft.specialtyGroup}
                      >
                        {getSpecialtyOptions(draft.specialtyGroup).map((opt) => (
                          <option key={opt.v} value={opt.v}>{opt.t}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div style={styles.formSection}>
                  <label style={styles.label}>מקום עבודה</label>
                  <input
                    type="text"
                    value={draft.workplace || ""}
                    onChange={(e) => handleFieldChange("workplace", e.target.value)}
                    style={styles.input}
                    placeholder="מקום עבודה (אם רלוונטי)"
                  />
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>האם מועסק בשיבא?</label>
                  <div style={styles.pillRow}>
                    {["כן", "לא"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleFieldChange("isShebaEmployee", opt)}
                        style={{
                          ...styles.pillBtn,
                          ...(draft.isShebaEmployee === opt ? styles.pillBtnActive : {}),
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>ניסיון במחקר</label>
                  <div style={styles.pillRow}>
                    {["כן", "לא"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleFieldChange("hasResearchExperience", opt)}
                        style={{
                          ...styles.pillBtn,
                          ...(draft.hasResearchExperience === opt ? styles.pillBtnActive : {}),
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {draft.hasResearchExperience === "כן" && (
                  <div style={styles.formSection}>
                    <label style={styles.label}>פירוט ניסיון מחקרי</label>
                    <textarea
                      value={draft.researchExperienceDetails || ""}
                      onChange={(e) => handleFieldChange("researchExperienceDetails", e.target.value)}
                      style={styles.textarea}
                      rows={3}
                    />
                  </div>
                )}

                <div style={styles.formSection}>
                  <label style={styles.label}>סוג העבודה המבוקשת</label>
                  <select
                    value={draft.workType}
                    onChange={(e) => handleFieldChange("workType", e.target.value)}
                    style={styles.select}
                  >
                    {WORK_TYPES.map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>העדפת תגמול</label>
                  <select
                    value={draft.compensationPreference}
                    onChange={(e) => handleFieldChange("compensationPreference", e.target.value)}
                    style={styles.select}
                  >
                    {COMPENSATION_PREFERENCES.map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>אופן ההשתתפות</label>
                  <select
                    value={draft.participationMode || ""}
                    onChange={(e) => handleFieldChange("participationMode", e.target.value)}
                    style={styles.select}
                  >
                    {[{ v: "", t: "בחר מיקום" }, { v: "פרונטלי", t: "פרונטלי" }, { v: "מרחוק", t: "מרחוק" }, { v: "היברידי", t: "היברידי" }].map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>זמינות למחקר</label>
                  <div style={styles.pillRow}>
                    {["כן", "לא"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleFieldChange("isAvailableForResearch", opt)}
                        style={{
                          ...styles.pillBtn,
                          ...(draft.isAvailableForResearch === opt ? styles.pillBtnActive : {}),
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>היקף שעות שבועי</label>
                  <input
                    type="number"
                    value={draft.weeklyHours || ""}
                    onChange={(e) => handleFieldChange("weeklyHours", e.target.value)}
                    style={styles.input}
                    placeholder="מספר שעות"
                    min="1"
                    max="60"
                  />
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>זמינות להתחלה</label>
                  <input
                    type="date"
                    value={draft.startDate || ""}
                    onChange={(e) => handleFieldChange("startDate", e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>כלים ומיומנויות</label>
                  <input
                    type="text"
                    value={draft.softwareSkills || ""}
                    onChange={(e) => handleFieldChange("softwareSkills", e.target.value)}
                    style={styles.input}
                    placeholder="Python, R, SPSS, ..."
                  />
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>ניסיון מקצועי קודם</label>
                  <textarea
                    value={draft.professionalExperience || ""}
                    onChange={(e) => handleFieldChange("professionalExperience", e.target.value)}
                    style={styles.textarea}
                    rows={3}
                  />
                </div>
              </>
            )}

            <div style={styles.formSection}>
              <label style={styles.label}>אודות / תיאור אישי ואקדמי</label>
              <textarea
                value={draft.personalAcademicDescription || ""}
                onChange={(e) => handleFieldChange("personalAcademicDescription", e.target.value)}
                style={styles.textarea}
                rows={4}
              />
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>ממליצים / חוות דעת</label>
              <textarea
                value={draft.recommendationRequest || ""}
                onChange={(e) => handleFieldChange("recommendationRequest", e.target.value)}
                style={styles.textarea}
                rows={3}
              />
            </div>

            {hasProfile && (
              <>
                <div style={styles.formSection}>
                  <label style={styles.label}>מסמכים קיימים</label>
                  {Array.isArray(userData?.documents) && userData.documents.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {userData.documents.map((doc, index) => (
                        <div
                          key={doc.id || index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            padding: "10px 12px",
                            border: "1px solid #eee",
                            borderRadius: 10,
                          }}
                        >
                          <div style={{ fontSize: 13, color: THEME_COLOR, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            📄 {doc.original_filename || doc.description || `מסמך ${index + 1}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteExistingDocument(doc)}
                            style={{ ...styles.secondaryBtn, borderRadius: 12, padding: "8px 12px" }}
                          >
                            מחיקה
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "#777" }}>לא הועלו מסמכים</div>
                  )}
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>העלאת מסמך חדש</label>
                  <input
                    ref={documentFileInputRef}
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    style={styles.input}
                  />
                  {documentFile && (
                    <div style={{ marginTop: 6, fontSize: 13, color: THEME_COLOR }}>
                      📄 {documentFile.name}
                    </div>
                  )}
                </div>
              </>
            )}

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={closeFullEdit} disabled={isSaving}>ביטול</button>
              <button
                style={{ ...styles.primaryBtn, opacity: isSaving ? 0.7 : 1 }}
                onClick={saveFullEdit}
                disabled={isSaving}
              >
                {isSaving ? "שומר..." : "שמירת שינויים"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
