import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { profilesAPI, API_BASE_URL } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import { validateFile } from "../utils/formValidation";
import PublicProfile from "./PublicProfile";
import ConfirmDialog from "../components/ConfirmDialog";
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
  { v: "סטאז׳", t: "סטאז׳" },
  { v: "מתמחה", t: "מתמחה" },
  { v: "מומחה/ית", t: "מומחה/ית" },
  { v: "התמחות־על / עמית/ת", t: "התמחות־על / עמית/ת" },
];

const APPRENTICE_STAGES = [
  { v: "", t: "בחר שלב" },
  { v: "סטודנט", t: "סטודנט" },
  { v: "לפני סטאז׳", t: "לפני סטאז׳" },
  { v: "סטאז׳ר", t: "סטאז׳ר" },
  { v: "אחרי סטאז׳", t: "אחרי סטאז׳" },
  { v: "מתמחה", t: "מתמחה" },
  { v: "רופא מתמחה", t: "רופא מתמחה" },
  { v: "אחר", t: "אחר" },
];

const RESEARCH_INTERESTS = [
  { v: "", t: "בחר תחום" },
  { v: "AI ברפואה", t: "AI ברפואה" },
  { v: "אפידמיולוגיה", t: "אפידמיולוגיה" },
  { v: "רפואה דחופה", t: "רפואה דחופה" },
  { v: "מחקר קליני", t: "מחקר קליני" },
];

const INSTITUTIONS = [
  { v: "", t: "בחר מוסד" },
  { v: "האוניברסיטה העברית בירושלים", t: "האוניברסיטה העברית בירושלים" },
  { v: "אוניברסיטת תל אביב", t: "אוניברסיטת תל אביב" },
  { v: "הטכניון", t: "הטכניון" },
  { v: "אוניברסיטת בן גוריון", t: "אוניברסיטת בן גוריון" },
  { v: "בר אילן", t: "אוניברסיטת בר אילן" },
  { v: "אריאל", t: "אוניברסיטת אריאל" },
  { v: "אוניברסיטת חיפה", t: "אוניברסיטת חיפה" },
  { v: "מכון ויצמן למדע", t: "מכון ויצמן למדע" },
  { v: "אוניברסיטת רייכמן", t: "אוניברסיטת רייכמן (הבינתחומי)" },
  { v: "אחר", t: "אחר" },
];

const WORK_TYPES = [
  { v: "", t: "בחר סוג" },
  { v: "איסוף נתונים", t: "איסוף נתונים" },
  { v: "כתיבה מדעית", t: "כתיבה מדעית" },
  { v: "ניתוח סטטיסטי", t: "ניתוח סטטיסטי" },
];

const COMPENSATION_PREFERENCES = [
  { v: "", t: "בחר העדפה" },
  { v: "מלגה", t: "מלגה" },
  { v: "שכר", t: "שכר" },
  { v: "קרדיט אקדמי", t: "קרדיט אקדמי" },
  { v: "ללא תגמול / התנדבות", t: "ללא תגמול / התנדבות" },
  { v: "גמיש", t: "גמיש" },
];

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

function formatDate(isoDate) {
  if (!isoDate || isoDate === "-") return "-";
  // If it already contains /, assume it's already formatted
  if (isoDate.includes("/")) return isoDate;
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return isoDate;
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

function findBestMatch(extractedValue, options) {
  if (!extractedValue) return "";
  // Exact match first
  const exact = options.find((o) => o.v === extractedValue);
  if (exact) return exact.v;
  // Substring match (either direction) - handles minor spelling differences
  const lower = extractedValue.replace(/[\u05F3\u05F4'׳״"]/g, "").trim().toLowerCase();
  const partial = options.find((o) => {
    if (!o.v) return false;
    const ov = o.v.replace(/[\u05F3\u05F4'׳״"]/g, "").trim().toLowerCase();
    return ov.includes(lower) || lower.includes(ov);
  });
  return partial ? partial.v : extractedValue;
}

function resolveField(profile, field) {
  // Prefer the _detail Hebrew name over the raw slug value
  const detail = profile[field + "_detail"];
  const raw = profile[field];
  const hebrewFromDetail = extractDisplay(detail);
  if (hebrewFromDetail && hebrewFromDetail !== "-") return hebrewFromDetail;
  if (typeof raw === "object") return extractDisplay(raw);
  return raw || "";
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

    // Resolve reference fields: prefer _detail Hebrew name, then best-match to canonical options
    institution: findBestMatch(resolveField(profile, "institution"), INSTITUTIONS),
    academicRank: findBestMatch(resolveField(profile, "academicRank"), ACADEMIC_RANKS),
    apprenticeStage: findBestMatch(resolveField(profile, "apprenticeStage"), APPRENTICE_STAGES),
    specialtyGroup: resolveField(profile, "specialtyGroup"),
    specialty: resolveField(profile, "specialty"),
    specialties: Array.isArray(profile.specialties_detail)
      ? profile.specialties_detail.map((s) => extractDisplay(s)).filter((x) => x && x !== "-")
      : Array.isArray(profile.specialties)
        ? profile.specialties.map((s) => extractDisplay(s)).filter((x) => x && x !== "-")
        : (profile.specialty ? [resolveField(profile, "specialty")] : []),
    researchInterests: findBestMatch(resolveField(profile, "researchInterests"), RESEARCH_INTERESTS),
    workType: findBestMatch(resolveField(profile, "workType"), WORK_TYPES),
    compensationPreference: Array.isArray(profile.compensationPreference)
      ? profile.compensationPreference.map((v) => typeof v === "object" ? (v.name_he || v.name || v.value || v) : v)
      : Array.isArray(profile.compensationPreference_detail)
        ? profile.compensationPreference_detail.map((v) => typeof v === "object" ? (v.name_he || v.name || v.value || v) : v)
        : [],
    participationMode: resolveField(profile, "participationMode"),
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
  modal: { background: "var(--card-bg, white)", padding: "2rem", borderRadius: "1rem", width: "95%", maxWidth: "720px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" },
  modalTitle: { fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-color, #2C2C6C)", borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: "10px" },
  formSection: { marginBottom: "16px" },
  label: { display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "600", color: "var(--text-color, #2C2C6C)" },
  input: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color, #ddd)", fontSize: "14px", boxSizing: "border-box", outlineColor: ACCENT_TEAL, backgroundColor: "var(--card-bg, white)", color: "var(--text-color, #333)" },
  textarea: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color, #ddd)", fontSize: "14px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outlineColor: ACCENT_TEAL, backgroundColor: "var(--card-bg, white)", color: "var(--text-color, #333)" },
  select: { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color, #ddd)", fontSize: "14px", boxSizing: "border-box", outlineColor: ACCENT_TEAL, backgroundColor: "var(--card-bg, white)", color: "var(--text-color, #333)", cursor: "pointer" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  primaryBtn: { padding: "10px 20px", borderRadius: "20px", background: THEME_COLOR, color: "white", border: "none", cursor: "pointer", fontWeight: "600", transition: "opacity 0.2s" },
  secondaryBtn: { padding: "10px 20px", borderRadius: "20px", background: "var(--card-bg, white)", color: "var(--text-color, #666)", border: "1px solid var(--border-color, #ddd)", cursor: "pointer", fontWeight: "600" },
  pillRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
  pillBtn: { padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--border-color, #ddd)", background: "var(--card-bg, white)", color: "var(--text-color, #555)", cursor: "pointer", fontSize: "14px", transition: "all 0.2s" },
  pillBtnActive: { background: ACCENT_TEAL, color: "white", borderColor: ACCENT_TEAL },
  calendarPopup: { position: "absolute", top: "105%", right: 0, width: "min(280px, 90vw)", background: "white", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", border: "1px solid #ddd", padding: 16, zIndex: 100 },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  navBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#666", padding: 4 },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 },
  dayName: { textAlign: "center", fontSize: 12, fontWeight: 700, color: "#999", marginBottom: 4 },
  dayBtn: { width: "100%", aspectRatio: "1", borderRadius: "50%", border: "none", background: "#f9f9ff", cursor: "pointer", fontSize: 13, color: THEME_COLOR, display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" },
  dayBtnActive: { background: ACCENT_TEAL, color: "white", fontWeight: 700, boxShadow: "0 2px 8px rgba(108, 213, 191, 0.4)" }
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

const CalendarIcon = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 2V6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 2V6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 10H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function DatePickerField({ label, value, onChange, minDate }) {
  const [show, setShow] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShow(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getMonthName = (date) => new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(date);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const handleDayClick = (day) => {
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && isoDate < minDate) return;
    onChange(isoDate);
    setShow(false);
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  const formatForDisplay = (isoDate) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div style={{ ...styles.formSection, position: 'relative' }} ref={popupRef}>
      <label style={styles.label}>{label}</label>
      <div
        onClick={() => setShow(!show)}
        style={{ ...styles.input, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 10 }}
      >
        <span style={{ color: value ? "inherit" : "#999" }}>{formatForDisplay(value) || "בחרי תאריך"}</span>
        <CalendarIcon color={ACCENT_TEAL} />
      </div>

      {show && (
        <div style={styles.calendarPopup}>
          <div style={styles.calendarHeader}>
            <button type="button" onClick={nextMonth} style={styles.navBtn}>&lt;</button>
            <span style={{ fontWeight: 700, color: THEME_COLOR }}>{getMonthName(currentDate)}</span>
            <button type="button" onClick={prevMonth} style={styles.navBtn}>&gt;</button>
          </div>
          <div style={styles.calendarGrid}>
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d} style={styles.dayName}>{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = new Date(year, month, day);
              const isoDateForCompare = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isPast = minDate && isoDateForCompare < minDate;
              const isSelected = value && value === isoDateForCompare;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  style={{
                    ...styles.dayBtn,
                    ...(isSelected ? styles.dayBtnActive : {}),
                    ...(isPast ? { opacity: 0.3, cursor: "not-allowed" } : {})
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const INITIAL_DRAFT = {
  specialtyGroup: "",
  specialty: "",
  specialties: [],
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
  compensationPreference: [],
  participationMode: "",
  isAvailableForResearch: "",
  weeklyHours: "",
  startDate: "",
  softwareSkills: "",
  professionalExperience: "",
  personalAcademicDescription: "",
  recommenders: [],
  linkedinUrl: "",
};

function Profile() {
  usePageTitle("פרופיל");
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
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
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, doc: null });
  const [editErrors, setEditErrors] = useState({});
  const [mentorsList, setMentorsList] = useState([]);
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

  useEffect(() => {
    let cancelled = false;
    profilesAPI.listMentors().then((data) => {
      if (!cancelled) {
        const list = Array.isArray(data) ? data : data?.results || [];
        setMentorsList(list);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
    } else if (hasMentorProfile && !hasApprenticeProfile) {
      navigate("/create-profile?role=apprentice");
    } else if (!hasMentorProfile && hasApprenticeProfile) {
      navigate("/create-profile?role=mentor");
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

    if (file) {
      const error = validateFile(file, { type: 'image' });
      if (error) {
        toast.error(error);
        return;
      }
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

  function deleteExistingDocument(doc) {
    if (!doc?.id) return;
    if (!activeRole) return;
    setConfirmDialog({ isOpen: true, doc });
  }

  async function confirmDeleteDocument() {
    const doc = confirmDialog.doc;
    setConfirmDialog({ isOpen: false, doc: null });
    if (!doc?.id || !activeRole) return;

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
      toast.error("מחיקת המסמך נכשלה. נסו שוב.");
    }
  }

  function isSpecialtyRelevant() {
    if (!isApprentice) return true;
    if (draft.apprenticeStage === "סטודנט") {
      return draft.yearOfStudy === "ו'" || draft.yearOfStudy === "ז'";
    }
    return draft.apprenticeStage !== "";
  }

  function validateEditDraft() {
    const errs = {};
    if (isMentor) {
      if (!draft.specialtyGroup) errs.specialtyGroup = "שדה חובה";
    }
    if (isApprentice) {
      if (!draft.apprenticeStage) errs.apprenticeStage = "שדה חובה";
    }
    if (draft.linkedinUrl) {
      try {
        const url = new URL(draft.linkedinUrl);
        if (!url.hostname.endsWith("linkedin.com")) {
          errs.linkedinUrl = "קישור LinkedIn לא תקין";
        }
      } catch {
        errs.linkedinUrl = "קישור LinkedIn לא תקין";
      }
    }
    return Object.keys(errs).length ? errs : null;
  }

  async function saveFullEdit() {
    if (!activeRole) return;
    const validationErrors = validateEditDraft();
    if (validationErrors) {
      setEditErrors(validationErrors);
      return;
    }
    setEditErrors({});
    setIsSaving(true);
    try {
      const profileType = activeRole;
      const updateFn = profileType === "mentor" ? profilesAPI.updateMentorProfile : profilesAPI.updateStudentProfile;
      // Strip file objects from recommenders before sending as JSON
      const draftToSend = {
        ...draft,
        recommenders: (draft.recommenders || []).map(({ file, ...rest }) => rest),
      };
      let updatedProfile = await updateFn(draftToSend);

      if (removeAvatar) {
        try {
          await profilesAPI.deleteAvatar(profileType);
          updatedProfile = { ...updatedProfile, avatarUrl: null, avatar: null };
        } catch (err) {
          console.error("Avatar delete failed", err);
          toast.error("הפרופיל נשמר, אבל הסרת התמונה נכשלה. ניתן לנסות שוב מאוחר יותר.");
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
          toast.error("הפרופיל נשמר, אבל המסמך לא הועלה. ניתן לנסות שוב מאוחר יותר.");
        }
      }

      // Upload recommendation letter files
      const recFiles = (draft.recommenders || []).filter(r => r.file);
      for (const rec of recFiles) {
        try {
          const uploadedRec = await profilesAPI.uploadDocument(
            rec.file,
            profileType,
            "RECOMMENDATION",
            `מכתב המלצה - ${rec.name || "ממליצ/ה"}`
          );
          const nextDocs = Array.isArray(updatedProfile?.documents)
            ? [...updatedProfile.documents, uploadedRec]
            : [uploadedRec];
          updatedProfile = { ...updatedProfile, documents: nextDocs };
        } catch (err) {
          console.error("Recommendation letter upload failed", err);
          toast.error(`מכתב המלצה של ${rec.name || "ממליצ/ה"} לא הועלה.`);
        }
      }

      if (profileType === "mentor") {
        setMentorProfile(updatedProfile);
      } else {
        setApprenticeProfile(updatedProfile);
      }
      setUserData(updatedProfile);
      // Refresh auth context so navbar syncs (name, avatar, flags)
      refreshUser();
      toast.success("הפרופיל עודכן בהצלחה!");
      closeFullEdit();
    } catch (err) {
      console.error("Error updating profile", err);
      const msg = err?.data?.detail || err?.data || "שגיאה בעדכון הפרופיל";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
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
      toast.error("הורדת המסמך נכשלה. אנא נסו שוב.");
    }
  }

  // Computed values that depend on hooks (but don't use hooks themselves)
  const shouldShowSpecialty = isMentor || showApprenticeSpecialty;
  
  // Show toggle button if they have at least one profile
  const showToggleButton = hasProfile;
  
  let toggleLabel = "";
  if (hasMentorProfile && hasApprenticeProfile) {
    toggleLabel = `החלף תצוגה (${isMentor ? "למתלמד/ת" : "למנחה"})`;
  } else if (hasMentorProfile && !hasApprenticeProfile) {
    toggleLabel = "צור/י פרופיל מתלמד/ת";
  } else if (!hasMentorProfile && hasApprenticeProfile) {
    toggleLabel = "צור/י פרופיל מנחה";
  }

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
      {showToggleButton && (
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
      )}

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
            {userData?.linkedinUrl && (
              <a
                href={userData.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-info-badge"
                style={{ color: "#0077b5", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                🔗 LinkedIn
              </a>
            )}
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
            {isApprentice && <InfoRow label="מוסד לימודים" value={getHebrewName(userData, "institution_detail")} />}
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
                <InfoRow label="התמחות" value={
                  Array.isArray(userData.specialties_detail) && userData.specialties_detail.length
                    ? extractDisplay(userData.specialties_detail)
                    : getHebrewName(userData, "specialty_detail")
                } />
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
            <InfoRow label="זמינות להתחלה" value={formatDate(userData.startDate || userData.availableFrom)} />
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

            {Array.isArray(userData.recommenders) && userData.recommenders.length > 0 && (
              <SectionCard title="ממליצים">
                {userData.recommenders.map((rec, idx) => (
                  <div key={idx} style={{ marginBottom: idx < userData.recommenders.length - 1 ? 12 : 0, paddingBottom: idx < userData.recommenders.length - 1 ? 12 : 0, borderBottom: idx < userData.recommenders.length - 1 ? "1px solid #eee" : "none" }}>
                    {userData.recommenders.length > 1 && <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>ממליצ/ה {idx + 1}</span>}
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
                {/* הצגת מכתבי המלצה */}
                {userData.documents && userData.documents.filter(d => d.document_type === "RECOMMENDATION").length > 0 && (
                  <div style={{ marginTop: 10, borderTop: "1px solid #eee", paddingTop: 10 }}>
                    <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, display: "block", marginBottom: 6 }}>מכתבי המלצה</span>
                    {userData.documents.filter(d => d.document_type === "RECOMMENDATION").map((doc, i) => (
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
                {Array.isArray(userData.activeResearches) && userData.activeResearches.length > 0 && (
                  <SectionCard title="מחקרים פעילים">
                    <div className="profile-research-list">
                      {userData.activeResearches.map((r) => (
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
          <div className="profile-edit-modal" style={styles.modal}>
            <h2 className="profile-edit-modal-title" style={styles.modalTitle}>עריכת פרופיל</h2>

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
                onChange={(e) => { handleFieldChange("specialtyGroup", e.target.value); setEditErrors((prev) => { const n = { ...prev }; delete n.specialtyGroup; return n; }); }}
                style={{ ...styles.select, ...(editErrors.specialtyGroup ? { borderColor: "#ef67a0" } : {}) }}
              >
                {SPECIALTY_GROUPS.map((opt) => (
                  <option key={opt.v} value={opt.v}>{opt.t}</option>
                ))}
              </select>
              {editErrors.specialtyGroup && <div style={{ color: "#ef67a0", fontSize: 12, marginTop: 4 }}>{editErrors.specialtyGroup}</div>}
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>התמחות / תחום מרכזי</label>
              {!draft.specialtyGroup ? (
                <div style={{ fontSize: 13, color: "#999", padding: "8px 0" }}>קודם בחרי/י קטגוריה</div>
              ) : (
                <div style={styles.pillRow}>
                  {getSpecialtyOptions(draft.specialtyGroup).filter((o) => o.v).map((opt) => {
                    const selected = Array.isArray(draft.specialties) && draft.specialties.includes(opt.v);
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          setDraft((prev) => {
                            const list = [...(prev.specialties || [])];
                            if (list.includes(opt.v)) return { ...prev, specialties: list.filter((s) => s !== opt.v), specialty: list.filter((s) => s !== opt.v)[0] || "" };
                            return { ...prev, specialties: [...list, opt.v], specialty: prev.specialty || opt.v };
                          });
                        }}
                        style={{ ...styles.pillBtn, ...(selected ? styles.pillBtnActive : {}) }}
                      >
                        {opt.t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {isApprentice && (
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
            )}

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
                    onChange={(e) => { handleFieldChange("apprenticeStage", e.target.value); setEditErrors((prev) => { const n = { ...prev }; delete n.apprenticeStage; return n; }); }}
                    style={{ ...styles.select, ...(editErrors.apprenticeStage ? { borderColor: "#ef67a0" } : {}) }}
                  >
                    {APPRENTICE_STAGES.map((opt) => (
                      <option key={opt.v} value={opt.v}>{opt.t}</option>
                    ))}
                  </select>
                  {editErrors.apprenticeStage && <div style={{ color: "#ef67a0", fontSize: 12, marginTop: 4 }}>{editErrors.apprenticeStage}</div>}
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
                      {!draft.specialtyGroup ? (
                        <div style={{ fontSize: 13, color: "#999", padding: "8px 0" }}>קודם בחרי/י קטגוריה</div>
                      ) : (
                        <div style={styles.pillRow}>
                          {getSpecialtyOptions(draft.specialtyGroup).filter((o) => o.v).map((opt) => {
                            const selected = Array.isArray(draft.specialties) && draft.specialties.includes(opt.v);
                            return (
                              <button
                                key={opt.v}
                                type="button"
                                onClick={() => {
                                  setDraft((prev) => {
                                    const list = [...(prev.specialties || [])];
                                    if (list.includes(opt.v)) return { ...prev, specialties: list.filter((s) => s !== opt.v), specialty: list.filter((s) => s !== opt.v)[0] || "" };
                                    return { ...prev, specialties: [...list, opt.v], specialty: prev.specialty || opt.v };
                                  });
                                }}
                                style={{ ...styles.pillBtn, ...(selected ? styles.pillBtnActive : {}) }}
                              >
                                {opt.t}
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                  <div style={styles.pillRow}>
                    {COMPENSATION_PREFERENCES.filter((o) => o.v).map((opt) => {
                      const selected = Array.isArray(draft.compensationPreference) && draft.compensationPreference.includes(opt.v);
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => {
                            setDraft((prev) => {
                              const list = [...(prev.compensationPreference || [])];
                              if (list.includes(opt.v)) return { ...prev, compensationPreference: list.filter((s) => s !== opt.v) };
                              return { ...prev, compensationPreference: [...list, opt.v] };
                            });
                          }}
                          style={{ ...styles.pillBtn, ...(selected ? styles.pillBtnActive : {}) }}
                        >
                          {opt.t}
                        </button>
                      );
                    })}
                  </div>
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

                <DatePickerField
                  label="זמינות להתחלה"
                  value={draft.startDate}
                  onChange={(date) => handleFieldChange("startDate", date)}
                />

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
              <label style={styles.label}>ממליצים (אופציונלי)</label>
              {(draft.recommenders && draft.recommenders.length > 0 ? draft.recommenders : [{ name: "", email: "", phone: "" }]).map((rec, idx) => (
                <div key={idx} style={{ position: "relative", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: 10, padding: "12px 12px 6px", marginBottom: 10, background: "var(--card-bg, #fafafa)" }}>
                  {(draft.recommenders || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (draft.recommenders || []).filter((_, i) => i !== idx);
                        handleFieldChange("recommenders", updated);
                      }}
                      style={{ position: "absolute", top: 6, left: 6, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 15, lineHeight: "1", display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="הסר ממליצ/ה"
                    >−</button>
                  )}
                  {(draft.recommenders || []).length > 1 && (
                    <span style={{ fontSize: 12, color: "var(--text-color, #6b7280)", fontWeight: 600, display: "block", marginBottom: 4 }}>ממליצ/ה {idx + 1}</span>
                  )}
                  {mentorsList.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ fontSize: 12, color: "var(--text-color, #6b7280)", marginBottom: 2, display: "block" }}>קישור למנחה מהאתר (אופציונלי)</label>
                      <select
                        value={rec.mentorId || ""}
                        onChange={(e) => {
                          const mentorId = e.target.value || null;
                          const mentor = mentorsList.find(m => String(m.id) === String(mentorId));
                          const u = [...(draft.recommenders || [])];
                          u[idx] = {
                            ...u[idx],
                            mentorId,
                            name: mentor ? mentor.name : u[idx].name,
                          };
                          handleFieldChange("recommenders", u);
                        }}
                        style={styles.select}
                      >
                        <option value="">בחר מנחה מהאתר (אופציונלי)</option>
                        {mentorsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                  <input
                    type="text"
                    value={rec.name || ""}
                    onChange={(e) => { const u = [...(draft.recommenders || [])]; u[idx] = { ...u[idx], name: e.target.value }; handleFieldChange("recommenders", u); }}
                    style={{ ...styles.input, marginBottom: 6 }}
                    placeholder="שם מלא"
                  />
                  <input
                    type="email"
                    value={rec.email || ""}
                    onChange={(e) => { const u = [...(draft.recommenders || [])]; u[idx] = { ...u[idx], email: e.target.value }; handleFieldChange("recommenders", u); }}
                    style={{ ...styles.input, direction: "ltr", textAlign: "left", marginBottom: 6 }}
                    placeholder="אימייל"
                  />
                  <input
                    type="tel"
                    value={rec.phone || ""}
                    onChange={(e) => { const u = [...(draft.recommenders || [])]; u[idx] = { ...u[idx], phone: e.target.value }; handleFieldChange("recommenders", u); }}
                    style={{ ...styles.input, direction: "ltr", textAlign: "left", marginBottom: 6 }}
                    placeholder="טלפון"
                  />
                  <div>
                    <label style={{ fontSize: 12, color: "var(--text-color, #6b7280)", marginBottom: 2, display: "block" }}>מכתב המלצה (אופציונלי)</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file) {
                          if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                            toast.error("ניתן להעלות קבצי PDF בלבד");
                            e.target.value = '';
                            return;
                          }
                          const error = validateFile(file, { type: 'document' });
                          if (error) {
                            toast.error(error);
                            e.target.value = '';
                            return;
                          }
                        }
                        const u = [...(draft.recommenders || [])];
                        u[idx] = { ...u[idx], file };
                        handleFieldChange("recommenders", u);
                      }}
                      style={{ ...styles.input, padding: "6px 10px", fontSize: 13 }}
                    />
                    {rec.file && <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-color, #2C2C6C)" }}>📄 {rec.file.name}</div>}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => handleFieldChange("recommenders", [...(draft.recommenders || []), { name: "", email: "", phone: "", file: null, mentorId: null }])}
                style={{ background: "none", border: "1px dashed var(--border-color, #9ca3af)", borderRadius: 8, padding: "6px 14px", color: "var(--text-color, #374151)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: "1" }}>+</span> הוספת ממליצ/ה
              </button>
            </div>

            <div style={styles.formSection}>
              <label style={styles.label}>פרופיל LinkedIn (אופציונלי)</label>
              <input
                type="url"
                value={draft.linkedinUrl || ""}
                onChange={(e) => { handleFieldChange("linkedinUrl", e.target.value); setEditErrors((prev) => { const n = { ...prev }; delete n.linkedinUrl; return n; }); }}
                style={{ ...styles.input, direction: "ltr", textAlign: "left", ...(editErrors.linkedinUrl ? { borderColor: "#ef67a0" } : {}) }}
                placeholder="https://linkedin.com/in/..."
              />
              {editErrors.linkedinUrl && <div style={{ color: "#ef67a0", fontSize: 12, marginTop: 4 }}>{editErrors.linkedinUrl}</div>}
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
                            border: "1px solid var(--border-color, #eee)",
                            borderRadius: 10,
                          }}
                        >
                          <div style={{ fontSize: 13, color: "var(--text-color, #2C2C6C)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                    <div style={{ fontSize: 13, color: "var(--text-color, #777)" }}>לא הועלו מסמכים</div>
                  )}
                </div>

                <div style={styles.formSection}>
                  <label style={styles.label}>העלאת מסמך חדש</label>
                  <input
                    ref={documentFileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) {
                        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                          toast.error("ניתן להעלות קבצי PDF בלבד");
                          e.target.value = '';
                          return;
                        }
                        const error = validateFile(file, { type: 'document' });
                        if (error) {
                          toast.error(error);
                          e.target.value = '';
                          return;
                        }
                      }
                      setDocumentFile(file);
                    }}
                    style={styles.input}
                  />
                  {documentFile && (
                    <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-color, #2C2C6C)" }}>
                      📄 {documentFile.name}
                    </div>
                  )}
                </div>
              </>
            )}

            <div style={styles.modalActions}>
              <button className="profile-edit-cancel-btn" style={styles.secondaryBtn} onClick={closeFullEdit} disabled={isSaving}>ביטול</button>
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="מחיקת מסמך"
        message={`למחוק את המסמך "${confirmDialog.doc?.original_filename || confirmDialog.doc?.description || "מסמך"}"?`}
        onConfirm={confirmDeleteDocument}
        onCancel={() => setConfirmDialog({ isOpen: false, doc: null })}
        confirmText="מחק"
        cancelText="ביטול"
      />
    </div>
  );
}

export default Profile;
