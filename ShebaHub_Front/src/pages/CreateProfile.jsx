import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { profilesAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import {
  SPECIALTIES_BASE,
  SPECIALTIES_SUPER,
  SPECIALTIES_FELLOWSHIPS,
} from "../data/specialties";
import { scrollToFirstError, validateFile } from "../utils/formValidation";

// --- CONSTANTS ---
const SPECIALTY_GROUPS = [
  { v: "", t: "בחרי/י קטגוריה" },
  { v: "מקצועות הבסיס", t: "מקצועות הבסיס" },
  { v: "מקצועות העל", t: "מקצועות העל" },
  { v: "השתלמויות עמיתים", t: "השתלמויות עמיתים" },
];

// מיפוי מהשם העברי לרשימת ההתמחויות
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

const INITIAL_FORM_STATE = {
  specialtyGroup: "",
  specialty: "",
  specialties: [],
  stageInMedicalTraining: "",
  workplace: "",
  isShebaEmployee: "",
  degrees: [],
  institution: "",
  academicRank: "",
  hasMentoringExperience: "",
  mentoringExperienceDetails: "",
  researchInterests: "",
  previousResearchDescription: "",
  personalAcademicDescription: "",
  recommenders: [{ name: "", email: "", phone: "", file: null, mentorId: null }],
  linkedinUrl: "",
  filesUpload: null,
  contractUpload: null,
  apprenticeStage: "",
  startYear: "",
  yearOfStudy: "",
  hasResearchExperience: "",
  researchExperienceDetails: "",
  weeklyHours: "",
  startDate: "",
  workType: "",
  softwareSkills: "",
  compensationPreference: [],
  professionalExperience: "",
  isAvailableForResearch: "",
  participationMode: "",
  _institutionOther: false,
};

export default function CreateMentorProfile() {
  usePageTitle("יצירת פרופיל");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [role, setRole] = useState("mentor");
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [mentorsList, setMentorsList] = useState([]);

  const hasMentorProfile = useMemo(() => user?.has_mentor_profile === true, [user]);
  const hasApprenticeProfile = useMemo(() => user?.has_student_profile === true, [user]);

  const MandatoryStar = () => <span style={{ color: ACCENT_PINK }}>*</span>;

  useEffect(() => {
    // If user already has any profile, redirect to home (role is locked)
    if (hasMentorProfile || hasApprenticeProfile) {
      navigate("/");
      return;
    }

    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");

    const requestedRole = roleParam === "apprentice" || roleParam === "mentor" ? roleParam : null;

    if (requestedRole) {
      setRole(requestedRole);
      setForm(INITIAL_FORM_STATE);
      setErrors({});
      return;
    }
  }, [location.search, hasApprenticeProfile, hasMentorProfile, navigate]);

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

  // --- LOGIC ---

  function handleRoleSwitch(newRole) {
    if (role === newRole) return;
    if (newRole === "mentor" && hasMentorProfile) return;
    if (newRole === "apprentice" && hasApprenticeProfile) return;
    setRole(newRole);
    setForm(INITIAL_FORM_STATE);
    setErrors({});
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    updateField(name, value);
  }

  function handleSpecialtyGroupChange(e) {
    const nextGroup = e.target.value;
    setForm((prev) => ({
      ...prev,
      specialtyGroup: nextGroup,
      specialty: "",
      specialties: [],
    }));
  }

  function toggleSpecialty(spec) {
    setForm((prev) => {
      const current = [...prev.specialties];
      if (current.includes(spec)) {
        return { ...prev, specialties: current.filter((s) => s !== spec), specialty: current.filter((s) => s !== spec)[0] || "" };
      }
      const next = [...current, spec];
      return { ...prev, specialties: next, specialty: next[0] || "" };
    });
    setErrors((prev) => {
      if (!prev.specialty) return prev;
      const copy = { ...prev };
      delete copy.specialty;
      return copy;
    });
  }

  function handleFileChange(e) {
    const { name, files } = e.target;
    const file = files && files[0] ? files[0] : null;
    if (file) {
      const error = validateFile(file, { type: 'document' });
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
        e.target.value = '';
        return;
      }
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
    updateField(name, file);
  }

  function toggleDegree(deg) {
    const NO_DEGREE = "ללא תואר קודם";

    setForm((prev) => {
      let newDegrees = [...prev.degrees];

      if (deg === NO_DEGREE) {
        if (newDegrees.includes(NO_DEGREE)) {
          return { ...prev, degrees: [] };
        }
        return { ...prev, degrees: [NO_DEGREE] };
      }

      if (newDegrees.includes(NO_DEGREE)) {
        newDegrees = newDegrees.filter(d => d !== NO_DEGREE);
      }

      if (newDegrees.includes(deg)) {
        newDegrees = newDegrees.filter((x) => x !== deg);
      } else {
        newDegrees.push(deg);
      }

      return { ...prev, degrees: newDegrees };
    });
  }

  function validate() {
    const next = {};
    if (role === "apprentice" && !form.institution) next.institution = "שדה חובה";
    // Degrees required unless "ללא תואר קודם" selected
    const hasNoDegree = form.degrees.includes("ללא תואר קודם");
    if (form.degrees.length === 0 && !hasNoDegree) next.degrees = "שדה חובה";
    if (!form.personalAcademicDescription.trim()) next.personalAcademicDescription = "שדה חובה";

    if (role === "mentor") {
      if (!form.specialtyGroup) next.specialtyGroup = "שדה חובה";
      if (form.specialties.length === 0) next.specialty = "יש לבחור לפחות התמחות אחת";
      if (!form.hasMentoringExperience) next.hasMentoringExperience = "שדה חובה";
    } else {
      if (!form.apprenticeStage) next.apprenticeStage = "שדה חובה";
      if (form.apprenticeStage === "סטודנט" && !form.yearOfStudy) next.yearOfStudy = "שדה חובה";
      if (!form.isAvailableForResearch) next.isAvailableForResearch = "שדה חובה";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return next;
    return null;
  }

  const isSpecialtyRelevant =
    role === "mentor" ||
    (form.apprenticeStage !== "סטודנט" && form.apprenticeStage !== "") ||
    (form.apprenticeStage === "סטודנט" && (form.yearOfStudy === "ו'" || form.yearOfStudy === "ז'"));

  const selectedGroup = form.specialtyGroup || "";

  const translateError = (error) => {
    if (!error) return error;

    const translations = {
      "This field is required.": "שדה חובה",
      "This field may not be blank.": "שדה זה לא יכול להיות ריק",
      "This field may not be null.": "שדה חובה",
      "Profile already exists": "פרופיל כבר קיים עבור משתמש זה",
      "Mentor profile already exists for this user.": "פרופיל מנחה כבר קיים עבור משתמש זה",
      "Student profile already exists for this user.": "פרופיל סטודנט כבר קיים עבור משתמש זה",
      "Validation failed.": "יש שגיאות בטופס",
      "Invalid value.": "ערך לא תקין",
      "Not a valid choice.": "בחירה לא תקינה",
      "Not a valid string.": "בחירה לא תקינה",
      '"כן" is not a valid choice.': "שדה חובה",
      '"לא" is not a valid choice.': "שדה חובה",
    };
    return translations[error] || error;
  };

  async function uploadInitialDocument(profileType) {
    if (!form.filesUpload) return;
    try {
      await profilesAPI.uploadDocument(
        form.filesUpload,
        profileType,
        "OTHER",
        form.filesUpload.name || "document"
      );
    } catch (err) {
      console.error("Document upload failed:", err);
      setServerError((prev) => prev || "הקובץ לא נשמר, ניתן לנסות להעלות אותו שוב לאחר יצירת הפרופיל");
    }
  }

  async function uploadRecommendationLetters(profileType) {
    const filesWithNames = form.recommenders.filter(r => r.file);
    for (const rec of filesWithNames) {
      try {
        await profilesAPI.uploadDocument(
          rec.file,
          profileType,
          "RECOMMENDATION",
          `מכתב המלצה - ${rec.name || "ממליצ/ה"}`
        );
      } catch (err) {
        console.error("Recommendation letter upload failed:", err);
      }
    }
  }

  async function submit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors) {
      setTimeout(() => scrollToFirstError(validationErrors), 100);
      return;
    }

    setIsLoading(true);
    setServerError("");

    const filterEmpty = (obj) => {
      const filtered = {};
      Object.entries(obj).forEach(([key, value]) => {
        if (value === false) {
          filtered[key] = value;
          return;
        }
        if (value !== undefined && value !== null && value !== "") {
          if (Array.isArray(value) && value.length === 0) return;
          filtered[key] = value;
        }
      });
      return filtered;
    };

    try {
      if (role === "mentor" && hasMentorProfile) {
        setServerError("כבר קיים פרופיל מנחה למשתמש");
        return;
      }
      if (role === "apprentice" && hasApprenticeProfile) {
        setServerError("כבר קיים פרופיל מתלמד למשתמש");
        return;
      }

      // If "ללא תואר קודם" selected, send empty degrees (backend understands sentinel)
      const degreesToSend = form.degrees.includes("ללא תואר קודם") ? ["ללא תואר קודם"] : form.degrees;

      let profileData = {
        degrees: degreesToSend,
        personalAcademicDescription: form.personalAcademicDescription,
        workplace: form.workplace,
        recommenders: form.recommenders.filter(r => r.name || r.email || r.phone).map(({ file, ...rest }) => rest),
        linkedinUrl: form.linkedinUrl,
      };

      const toBoolean = (val) => val === "כן" ? true : val === "לא" ? false : undefined;

      if (role === "mentor") {
        const profileType = "mentor";
        profileData = {
          ...profileData,
          specialtyGroup: form.specialtyGroup,
          specialty: form.specialties[0] || form.specialty,
          specialties: form.specialties,
          academicRank: form.academicRank,
          hasMentoringExperience: toBoolean(form.hasMentoringExperience),
          mentoringExperienceDetails: form.mentoringExperienceDetails,
          researchInterests: form.researchInterests,
          previousResearchDescription: form.previousResearchDescription,
        };

        profileData = filterEmpty(profileData);

        await profilesAPI.createMentorProfile(profileData);

        await uploadInitialDocument(profileType);
        await uploadRecommendationLetters(profileType);

        if (updateUser) {
          updateUser({ has_mentor_profile: true });
        }
      } else {
        const profileType = "student";
        profileData = {
          ...profileData,
          institution: form.institution,
          apprenticeStage: form.apprenticeStage,
          startYear: form.startYear ? parseInt(form.startYear) : undefined,
          yearOfStudy: form.yearOfStudy,
          isShebaEmployee: toBoolean(form.isShebaEmployee),
          hasResearchExperience: toBoolean(form.hasResearchExperience),
          researchExperienceDetails: form.researchExperienceDetails,
          isAvailableForResearch: toBoolean(form.isAvailableForResearch),
          weeklyHours: form.weeklyHours ? parseInt(form.weeklyHours) : undefined,
          startDate: form.startDate,
          workType: form.workType,
          softwareSkills: form.softwareSkills,
          compensationPreference: form.compensationPreference,
          professionalExperience: form.professionalExperience,
          participationMode: form.participationMode,
        };

        if (isSpecialtyRelevant && (form.specialties.length > 0 || form.specialty)) {
          profileData.specialtyGroup = form.specialtyGroup;
          profileData.specialty = form.specialties[0] || form.specialty;
          profileData.specialties = form.specialties;
        }

        profileData = filterEmpty(profileData);

        await profilesAPI.createStudentProfile(profileData);

        await uploadInitialDocument(profileType);
        await uploadRecommendationLetters(profileType);

        if (updateUser) {
          updateUser({ has_student_profile: true });
        }
      }

      toast.success("הפרופיל נוצר בהצלחה!");
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 0);
    } catch (error) {
      console.error("Profile creation failed:", error);
      console.error("Server error data:", JSON.stringify(error.data, null, 2));

      if (error.data) {
        if (error.data.code === "ROLE_LOCKED") {
          setServerError("כבר קיים פרופיל מסוג אחר. לא ניתן ליצור פרופיל נוסף.");
        } else if (error.data.code === "CONFLICT") {
          setServerError(translateError(error.data.message));
        } else if (error.data.code === "VALIDATION_ERROR" && error.data.details) {
          const newErrors = {};
          let hasFieldErrors = false;

          Object.keys(error.data.details).forEach(key => {
            const errorMsg = Array.isArray(error.data.details[key])
              ? error.data.details[key][0]
              : error.data.details[key];
            newErrors[key] = translateError(errorMsg);
            hasFieldErrors = true;
          });

          if (hasFieldErrors) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            setServerError("יש שגיאות בטופס, נא לתקן את השדות המסומנים");
            setTimeout(() => scrollToFirstError(newErrors), 100);
          } else {
            setServerError(translateError(error.data.message) || "אירעה שגיאה ביצירת הפרופיל");
          }
        } else if (error.data.detail) {
          setServerError(translateError(error.data.detail));
        } else if (error.data.message) {
          setServerError(translateError(error.data.message));
        } else if (error.data.non_field_errors) {
          setServerError(translateError(error.data.non_field_errors[0]));
        } else {
          const newErrors = {};
          Object.keys(error.data).forEach(key => {
            if (key !== 'code' && key !== 'message' && key !== 'details') {
              const errorMsg = Array.isArray(error.data[key])
                ? error.data[key][0]
                : error.data[key];
              newErrors[key] = translateError(errorMsg);
            }
          });
          if (Object.keys(newErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            setServerError("יש שגיאות בטופס, נא לתקן את השדות המסומנים");
            setTimeout(() => scrollToFirstError(newErrors), 100);
          } else {
            setServerError("אירעה שגיאה ביצירת הפרופיל");
          }
        }
      } else {
        setServerError("אירעה שגיאה בתקשורת, נסה שנית מאוחר יותר");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div dir="rtl" style={styles.page}>
      <style>{`
      :root {
        --switch-bg: #f5f5fa;
        --btn-inactive-text: #666;
        --btn-active-bg: #ffffff;
        --btn-active-text: #2C2C6C;
        --field-bg: #ffffff;
        --text-main: #333333;
        --border-color: #dddddd;
        --popup-bg: #ffffff;
        --theme-color: #2C2C6C;
      }
      [data-theme='dark'], .dark-mode {
        --switch-bg: #1a1a1a;
        --btn-inactive-text: #aaa;
        --btn-active-bg: #333;
        --btn-active-text: #ffffff;
        --field-bg: #2a2a2a;
        --text-main: #eeeeee;
        --border-color: #444444;
        --popup-bg: #1e1e1e;
        --theme-color: #c0c0e8;
      }
      
      /* Active state style */
      .pill-btn-active {
        background-color: ${ACCENT_TEAL} !important;
        color: white !important;
        border-color: ${ACCENT_TEAL} !important;
        /* Force shadow even on focus */
        box-shadow: 0 4px 12px rgba(108, 213, 191, 0.3) !important;
        outline: none !important;
      }

      /* Focus management - KILL THE OUTLINE */
      .pill-btn:focus, 
      .pill-btn:focus-visible, 
      .pill-btn:active {
        outline: none !important;
        /* Only remove shadow for non-active buttons */
      }
      
      /* Ensure active buttons keep their style when focused */
      .pill-btn-active:focus, 
      .pill-btn-active:focus-visible {
        outline: none !important;
        box-shadow: 0 4px 12px rgba(108, 213, 191, 0.3) !important;
        border-color: ${ACCENT_TEAL} !important;
      }

      /* Default border color for inactive buttons on focus */
      .pill-btn:not(.pill-btn-active):focus {
        border-color: #ccc !important;
        box-shadow: none !important;
      }
      
      .day-btn-active {
        background-color: ${ACCENT_TEAL} !important;
        color: white !important;
        font-weight: 700 !important;
      }
    `}</style>

      <div dir="rtl" style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.title}>יצירת פרופיל</h1>
          <div style={styles.titleUnderline}></div>
        </header>

        <div style={styles.roleSwitch}>
          <button
            type="button"
            onClick={() => handleRoleSwitch("mentor")}
            disabled={hasMentorProfile}
            style={{
              ...styles.roleBtn,
              ...(role === "mentor" ? styles.roleBtnActive : {}),
              ...(hasMentorProfile ? styles.disabled : {})
            }}
          >
            מנחה
          </button>
          <button
            type="button"
            onClick={() => handleRoleSwitch("apprentice")}
            disabled={hasApprenticeProfile}
            style={{
              ...styles.roleBtn,
              ...(role === "apprentice" ? styles.roleBtnActive : {}),
              ...(hasApprenticeProfile ? styles.disabled : {})
            }}
          >
            מתלמד/ת
          </button>
        </div>

        <form onSubmit={submit} style={styles.card} className="create-profile-card">

          {/* SECTION 1 */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>פרטים כלליים ושלב הכשרה</h3>
            <div className="mentor-grid" style={styles.grid}>
              {role === "apprentice" && (
                <>
                  <SelectField
                    label={<>שלב בהכשרה רפואית <MandatoryStar /></>}
                    name="apprenticeStage"
                    value={form.apprenticeStage}
                    onChange={handleChange}
                    error={errors.apprenticeStage}
                    options={[{ v: "", t: "בחרי/י שלב" }, { v: "סטודנט", t: "סטודנט" }, { v: "לפני סטאז׳", t: "לפני סטאז׳" }, { v: "סטאז׳ר", t: "סטאז׳ר" }, { v: "אחרי סטאז׳", t: "אחרי סטאז׳" }, { v: "מתמחה", t: "מתמחה" }, { v: "רופא מתמחה", t: "רופא מתמחה" }, { v: "אחר", t: "אחר" }]}
                  />
                  <SelectField label="שנת תחילת הלימודים" name="startYear" value={form.startYear} onChange={handleChange} options={[{ v: "", t: "בחרי שנה" }, ...START_YEARS]} />
                </>
              )}

              {role === "apprentice" && form.apprenticeStage === "סטודנט" && (
                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <label style={styles.label}>שנת לימודים <MandatoryStar /></label>
                  <div style={styles.inline}>
                    {["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'"].map((y) => (
                      <button key={y} type="button" onClick={() => updateField("yearOfStudy", y)} className={`pill-btn ${form.yearOfStudy === y ? "pill-btn-active" : ""}`} style={{ ...styles.pillBtn, ...(form.yearOfStudy === y ? styles.pillBtnActive : {}) }}>{y}</button>
                    ))}
                  </div>
                  {errors.yearOfStudy && <div style={styles.error}>{errors.yearOfStudy}</div>}
                </div>
              )}

              {isSpecialtyRelevant && (
                <>
                  <SelectField
                    label={<>קטגוריית התמחות <MandatoryStar /></>}
                    name="specialtyGroup"
                    value={form.specialtyGroup}
                    onChange={handleSpecialtyGroupChange}
                    error={errors.specialtyGroup}
                    options={SPECIALTY_GROUPS}
                  />
                  <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                    <label style={styles.label}>התמחויות <MandatoryStar /> <span style={{ fontWeight: 400, fontSize: 11, color: "#888" }}>(ניתן לבחור מספר התמחויות)</span></label>
                    {selectedGroup ? (
                      <div style={styles.inline}>
                        {(specialtiesByGroup[selectedGroup] || []).map((spec) => (
                          <button
                            key={spec}
                            type="button"
                            onClick={() => toggleSpecialty(spec)}
                            className={`pill-btn ${form.specialties.includes(spec) ? "pill-btn-active" : ""}`}
                            style={{ ...styles.pillBtn, ...(form.specialties.includes(spec) ? styles.pillBtnActive : {}) }}
                          >
                            {spec}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "#999", fontSize: 13 }}>קודם בחרי/י קטגוריה</div>
                    )}
                    {errors.specialty && <div style={styles.error}>{errors.specialty}</div>}
                  </div>
                </>
              )}

              {role === "apprentice" && (
                <>
                  <SelectField
                    label={<>מוסד לימודים <MandatoryStar /></>}
                    name="institution"
                    value={form.institution}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        updateField("institution", "");
                        updateField("_institutionOther", true);
                      } else {
                        updateField("institution", e.target.value);
                        updateField("_institutionOther", false);
                      }
                    }}
                    error={errors.institution}
                    options={[
                      { v: "", t: "בחרי/י מוסד" },
                      { v: "האוניברסיטה העברית בירושלים", t: "האוניברסיטה העברית בירושלים" },
                      { v: "אוניברסיטת תל אביב", t: "אוניברסיטת תל אביב" },
                      { v: "הטכניון", t: "הטכניון" },
                      { v: "אוניברסיטת בן גוריון", t: "אוניברסיטת בן גוריון" },
                      { v: "אוניברסיטת בר אילן", t: "אוניברסיטת בר אילן" },
                      { v: "אוניברסיטת אריאל", t: "אוניברסיטת אריאל" },
                      { v: "אוניברסיטת חיפה", t: "אוניברסיטת חיפה" },
                      { v: "מכון ויצמן למדע", t: "מכון ויצמן למדע" },
                      { v: "אוניברסיטת רייכמן", t: "אוניברסיטת רייכמן (הבינתחומי)" },
                      { v: "__other__", t: "אחר (הקלד/י)" },
                    ]}
                  />
                  {form._institutionOther && (
                    <InputField
                      label="שם המוסד"
                      name="institution"
                      value={form.institution}
                      onChange={handleChange}
                      error={errors.institution}
                      placeholder="הקלד/י שם מוסד"
                    />
                  )}
                </>
              )}

              {role === "mentor" && (
                <SelectField label="שלב בהכשרה הרפואית" name="academicRank" value={form.academicRank} onChange={handleChange} options={[{ v: "", t: "בחרי שלב בהכשרה" }, { v: "סטאז׳", t: "סטאז׳" }, { v: "מתמחה", t: "מתמחה" }, { v: "מומחה/ית", t: "מומחה/ית" }, { v: "התמחות־על / עמית/ת", t: "התמחות־על / עמית/ת" }]} />
              )}
            </div>
          </div>

          {/* SECTION 2 */}
          <div style={{ ...styles.section, borderTop: "1px solid var(--border-color, #eee)", paddingTop: 24 }}>
            <h3 style={styles.sectionTitle}>ניסיון ומקום עבודה</h3>
            <div className="mentor-grid" style={styles.grid}>
              <InputField
                label="מקום עבודה"
                name="workplace"
                value={form.workplace}
                onChange={handleChange}
                placeholder="מקום עבודה (אם רלוונטי)"
              />

              {role === "apprentice" && (
                <div style={styles.field}>
                  <label style={styles.label}>האם את/ה מועסק בשיבא?</label>
                  <div style={styles.inline}>
                    {["כן", "לא"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateField("isShebaEmployee", opt)}
                        className={`pill-btn ${form.isShebaEmployee === opt ? "pill-btn-active" : ""}`}
                        style={{ ...styles.pillBtn, ...(form.isShebaEmployee === opt ? styles.pillBtnActive : {}) }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DegreesField
              label={<>תארים <MandatoryStar /></>}
              name="degrees"
              value={form.degrees}
              onToggle={toggleDegree}
              error={errors.degrees}
              options={["MD", "PhD", "MSc", "MPH", "MBA", "ללא תואר קודם"]}
            />

            {role === "mentor" ? (
              <div style={{ marginTop: 15 }}>
                <div style={styles.field}>
                  <label style={styles.label}>ניסיון בהנחיה <MandatoryStar /></label>
                  <div style={styles.inline}>
                    {["כן", "לא"].map((opt) => (
                      <button key={opt} type="button" onClick={() => updateField("hasMentoringExperience", opt)} className={`pill-btn ${form.hasMentoringExperience === opt ? "pill-btn-active" : ""}`} style={{ ...styles.pillBtn, ...(form.hasMentoringExperience === opt ? styles.pillBtnActive : {}), ...(errors.hasMentoringExperience ? { borderColor: ACCENT_PINK } : {}) }}>{opt}</button>
                    ))}
                  </div>
                  {errors.hasMentoringExperience && <div style={styles.error}>{errors.hasMentoringExperience}</div>}
                  {form.hasMentoringExperience === "כן" && (
                    <TextAreaField label="פירוט ניסיון בהנחיה" name="mentoringExperienceDetails" value={form.mentoringExperienceDetails} onChange={handleChange} rows={3} />
                  )}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 15 }}>
                <div style={styles.field}>
                  <label style={styles.label}>ניסיון במחקר</label>
                  <div style={styles.inline}>
                    {["כן", "לא"].map((opt) => (
                      <button key={opt} type="button" onClick={() => updateField("hasResearchExperience", opt)} className={`pill-btn ${form.hasResearchExperience === opt ? "pill-btn-active" : ""}`} style={{ ...styles.pillBtn, ...(form.hasResearchExperience === opt ? styles.pillBtnActive : {}) }}>{opt}</button>
                    ))}
                  </div>
                  {form.hasResearchExperience === "כן" && (
                    <TextAreaField label="פירוט ניסיון מחקרי" name="researchExperienceDetails" value={form.researchExperienceDetails} onChange={handleChange} rows={3} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3 */}
          <div style={{ ...styles.section, borderTop: "1px solid var(--border-color, #eee)", paddingTop: 24 }}>
            <h3 style={styles.sectionTitle}>
              {role === "mentor" ? "רקע מחקרי ותחומי עניין" : "מחקר וזמינות"}
            </h3>

            {role === "apprentice" ? (
              <>
                <div className="mentor-grid" style={styles.grid}>
                  <SelectField label="סוג העבודה המבוקשת" name="workType" value={form.workType} onChange={handleChange} options={[{ v: "", t: "בחרי עבודה" }, { v: "איסוף נתונים", t: "איסוף נתונים" }, { v: "כתיבה מדעית", t: "כתיבה מדעית" }, { v: "ניתוח סטטיסטי", t: "ניתוח סטטיסטי" }]} />
                  <div style={styles.field}>
                    <label style={styles.label}>העדפת תגמול</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {["מלגה", "שכר", "קרדיט אקדמי", "ללא תגמול / התנדבות", "גמיש"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setForm((prev) => {
                              const types = [...(prev.compensationPreference || [])];
                              if (types.includes(opt)) return { ...prev, compensationPreference: types.filter(t => t !== opt) };
                              return { ...prev, compensationPreference: [...types, opt] };
                            });
                          }}
                          className={`pill-btn ${(form.compensationPreference || []).includes(opt) ? "pill-btn-active" : ""}`}
                          style={{ ...styles.pillBtn, ...((form.compensationPreference || []).includes(opt) ? styles.pillBtnActive : {}) }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <SelectField label="אופן ההשתתפות" name="participationMode" value={form.participationMode} onChange={handleChange} options={[{ v: "", t: "בחרי מיקום" }, { v: "פרונטלי", t: "פרונטלי" }, { v: "מרחוק", t: "מרחוק" }, { v: "היברידי", t: "היברידי" }]} />

                  <div style={styles.field}>
                    <label style={styles.label}>זמינות למחקר <MandatoryStar /></label>
                    <div style={styles.inline}>
                      {["כן", "לא"].map((opt) => (
                        <button key={opt} type="button" onClick={() => updateField("isAvailableForResearch", opt)} className={`pill-btn ${form.isAvailableForResearch === opt ? "pill-btn-active" : ""}`} style={{ ...styles.pillBtn, ...(form.isAvailableForResearch === opt ? styles.pillBtnActive : {}) }}>{opt}</button>
                      ))}
                    </div>
                    {errors.isAvailableForResearch && <div style={styles.error}>{errors.isAvailableForResearch}</div>}
                  </div>
                </div>

                <div className="mentor-grid" style={styles.grid}>
                  <InputField label="היקף שעות שבועי" name="weeklyHours" value={form.weeklyHours} onChange={handleChange} placeholder="מספר בלבד" />
                  <DatePickerField
                    label="זמינות להתחלה"
                    name="startDate"
                    value={form.startDate}
                    onChange={(date) => updateField("startDate", date)}
                    minDate={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="mentor-grid" style={styles.grid}>
                  <TextAreaField label="מיומנויות וכלים" name="softwareSkills" value={form.softwareSkills} onChange={handleChange} placeholder="למשל: SPSS, Python..." rows={2} />
                  <TextAreaField label="ניסיון מקצועי קודם" name="professionalExperience" value={form.professionalExperience} onChange={handleChange} placeholder="תאר/י ניסיון רלוונטי..." rows={2} />
                </div>
              </>
            ) : (
              <>
                <div className="mentor-grid" style={styles.grid}>
                  <SelectField label="תחומי עניין מחקר" name="researchInterests" value={form.researchInterests} onChange={handleChange} options={[{ v: "", t: "בחרי/י תחומים" }, { v: "AI ברפואה", t: "AI ברפואה" }, { v: "אפידמיולוגיה", t: "אפידמיולוגיה" }, { v: "רפואה דחופה", t: "רפואה דחופה" }, { v: "מחקר קליני", t: "מחקר קליני" }]} />
                </div>
                <TextAreaField label="תיאור מחקרים קודמים" name="previousResearchDescription" value={form.previousResearchDescription} onChange={handleChange} />
              </>
            )}
          </div>

          {/* SECTION 4 */}
          <div style={{ ...styles.section, borderTop: "1px solid var(--border-color, #eee)", paddingTop: 24 }}>
            <h3 style={styles.sectionTitle}>פרטים נוספים וקבצים</h3>
            <TextAreaField
              label={<>תיאור רקע אישי ואקדמי <MandatoryStar /></>}
              name="personalAcademicDescription"
              value={form.personalAcademicDescription}
              onChange={handleChange}
              error={errors.personalAcademicDescription}
              rows={4}
            />

            {role === "apprentice" && (
              <>
                <h4 style={{ margin: "18px 0 8px", color: "var(--text-color, #374151)", fontSize: 15 }}>פרטי ממליצ/ה (אופציונלי)</h4>
                {form.recommenders.map((rec, idx) => (
                  <div key={idx} style={{ position: "relative", border: "1px solid var(--border-color, #e5e7eb)", borderRadius: 10, padding: "14px 14px 8px", marginBottom: 12, background: "var(--card-bg, #fafafa)" }}>
                    {form.recommenders.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.recommenders.filter((_, i) => i !== idx);
                          updateField("recommenders", updated);
                        }}
                        style={{ position: "absolute", top: 8, left: 8, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 16, lineHeight: "1", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="הסר ממליצ/ה"
                      >−</button>
                    )}
                    {form.recommenders.length > 1 && (
                      <span style={{ fontSize: 13, color: "var(--text-color, #6b7280)", fontWeight: 600, marginBottom: 6, display: "block" }}>ממליצ/ה {idx + 1}</span>
                    )}
                    {mentorsList.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={styles.label}>קישור למנחה מהאתר (אופציונלי)</label>
                        <select
                          value={rec.mentorId || ""}
                          onChange={(e) => {
                            const mentorId = e.target.value || null;
                            const mentor = mentorsList.find(m => String(m.id) === String(mentorId));
                            const updated = [...form.recommenders];
                            updated[idx] = {
                              ...updated[idx],
                              mentorId,
                              name: mentor ? mentor.name : updated[idx].name,
                            };
                            updateField("recommenders", updated);
                          }}
                          style={styles.select}
                        >
                          <option value="">בחר מנחה מהאתר (אופציונלי)</option>
                          {mentorsList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="recommender-grid" style={styles.grid}>
                      <div>
                        <label style={styles.label}>שם מלא</label>
                        <input
                          type="text"
                          value={rec.name}
                          onChange={(e) => {
                            const updated = [...form.recommenders];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            updateField("recommenders", updated);
                          }}
                          placeholder="שם פרטי ומשפחה"
                          style={styles.input}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>אימייל</label>
                        <input
                          type="email"
                          value={rec.email}
                          onChange={(e) => {
                            const updated = [...form.recommenders];
                            updated[idx] = { ...updated[idx], email: e.target.value };
                            updateField("recommenders", updated);
                          }}
                          placeholder="example@email.com"
                          style={{ ...styles.input, direction: "ltr", textAlign: "left" }}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>טלפון</label>
                        <input
                          type="tel"
                          value={rec.phone}
                          onChange={(e) => {
                            const updated = [...form.recommenders];
                            updated[idx] = { ...updated[idx], phone: e.target.value };
                            updateField("recommenders", updated);
                          }}
                          placeholder="050-0000000"
                          style={{ ...styles.input, direction: "ltr", textAlign: "left" }}
                        />
                      </div>
                      <div>
                        <label style={styles.label}>מכתב המלצה</label>
                        <div style={styles.fileWrapper}>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            id={`recommender-file-${idx}`}
                            style={styles.fileInput}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                const error = validateFile(file, { type: 'document' });
                                if (error) {
                                  setErrors(prev => ({ ...prev, [`recommenderFile_${idx}`]: error }));
                                  e.target.value = '';
                                  return;
                                }
                                setErrors(prev => { const next = { ...prev }; delete next[`recommenderFile_${idx}`]; return next; });
                              }
                              const updated = [...form.recommenders];
                              updated[idx] = { ...updated[idx], file };
                              updateField("recommenders", updated);
                            }}
                          />
                          <label htmlFor={`recommender-file-${idx}`} style={styles.fileLabel} className="create-profile-file-label">
                            {rec.file ? `✅ ${rec.file.name}` : "בחרי קובץ..."}
                          </label>
                        </div>
                        {errors[`recommenderFile_${idx}`] && <div style={styles.error}>{errors[`recommenderFile_${idx}`]}</div>}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateField("recommenders", [...form.recommenders, { name: "", email: "", phone: "", file: null, mentorId: null }])}
                  style={{ background: "none", border: "1px dashed var(--border-color, #9ca3af)", borderRadius: 8, padding: "8px 18px", color: "var(--text-color, #374151)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, lineHeight: "1" }}>+</span> הוספת ממליצ/ה
                </button>
              </>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={styles.label}>פרופיל LinkedIn (אופציונלי)</label>
              <input
                type="url"
                name="linkedinUrl"
                value={form.linkedinUrl || ""}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
                style={{
                  ...styles.input,
                  direction: "ltr",
                  textAlign: "left",
                  ...(errors.linkedinUrl ? { borderColor: "#ef4444" } : {}),
                }}
              />
              {errors.linkedinUrl && (
                <span style={{ color: "#ef4444", fontSize: 13 }}>{errors.linkedinUrl}</span>
              )}
            </div>

            <div className="mentor-grid" style={{ ...styles.grid, marginTop: 15 }}>
              <FileField label="העלאת קבצים (אופציונלי)" name="filesUpload" file={form.filesUpload} onChange={handleFileChange} error={errors.filesUpload} />
            </div>
          </div>

          {/* הצגת שגיאות מהשרת */}
          {serverError && (
            <div style={styles.serverError}>
              {serverError}
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="submit"
              style={{
                ...styles.primaryBtn,
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? "not-allowed" : "pointer"
              }}
              disabled={isLoading}
            >
              {isLoading ? "שומר..." : "אישור ושמירה"}
            </button>
          </div>

          <style>{`
          .mentor-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
          .recommender-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
          @media (min-width: 768px) { 
            .mentor-grid { grid-template-columns: 1fr 1fr; }
            .recommender-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
          }
          @media (max-width: 767px) and (min-width: 480px) {
            .recommender-grid { grid-template-columns: 1fr 1fr; }
          }
        `}</style>
        </form>
      </div >
    </div>
  );
}

// --- SUB-COMPONENTS ---

function InputField({ label, name, value, onChange, placeholder, disabled, error, type = "text" }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} style={{ ...styles.input, ...(disabled ? styles.disabled : {}), ...(error ? styles.inputError : {}) }} />
      {error && <div style={styles.error}>{error}</div>}
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
    const d = new Date(year, month, day);
    const isoDate = d.toISOString().split('T')[0];
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
    <div style={{ ...styles.field, position: 'relative' }} ref={popupRef}>
      <label style={styles.label}>{label}</label>
      <div
        onClick={() => setShow(!show)}
        style={{ ...styles.input, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 10 }}
      >
        <span>{formatForDisplay(value) || "בחרי תאריך"}</span>
        <CalendarIcon color={ACCENT_TEAL} />
      </div>

      {show && (
        <div style={styles.calendarPopup}>
          <div style={styles.calendarHeader}>
            <button type="button" onClick={nextMonth} style={styles.navBtn}>&lt;</button>
            <span style={{ fontWeight: 700, color: "var(--text-color, #2C2C6C)" }}>{getMonthName(currentDate)}</span>
            <button type="button" onClick={prevMonth} style={styles.navBtn}>&gt;</button>
          </div>
          <div style={styles.calendarGrid}>
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d} style={styles.dayName}>{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = new Date(year, month, day);
              const isoDate = d.toISOString().split('T')[0];
              const isPast = minDate && isoDate < minDate;
              const isSelected = value && parseInt(value.split('-')[2]) === day && parseInt(value.split('-')[1]) === (month + 1) && parseInt(value.split('-')[0]) === year;
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


function SelectField({ label, name, value, onChange, options, disabled, error }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <select name={name} value={value} onChange={onChange} disabled={disabled} style={{ ...styles.select, ...(disabled ? styles.disabled : {}), ...(error ? styles.inputError : {}) }}>
        {options.map((o) => (<option key={o.v} value={o.v}>{o.t}</option>))}
      </select>
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, rows, placeholder, error }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <textarea name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder} style={{ ...styles.textarea, ...(error ? styles.inputError : {}) }} />
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function DegreesField({ label, value, onToggle, options, error }) {
  return (
    <div style={{ ...styles.field, marginTop: 15 }}>
      <label style={styles.label}>{label}</label>
      <div style={styles.inline}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`pill-btn ${value.includes(opt) ? "pill-btn-active" : ""}`}
            style={{ ...styles.pillBtn, ...(value.includes(opt) ? styles.pillBtnActive : {}) }}
          >
            {opt}
          </button>
        ))}
      </div>
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

function FileField({ label, name, file, onChange, error }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.fileWrapper}>
        <input type="file" name={name} onChange={onChange} style={styles.fileInput} id={name} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
        <label htmlFor={name} style={styles.fileLabel} className="create-profile-file-label">
          {file ? `✅ ${file.name}` : "בחרי קובץ..."}
        </label>
      </div>
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

// --- STYLES ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";

const styles = {
  page: { maxWidth: 800, margin: "0 auto", padding: "24px 12px", fontFamily: "Rubik, system-ui, sans-serif", color: "var(--theme-color)" },
  header: { textAlign: "center", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  titleUnderline: { width: 50, height: 4, background: ACCENT_TEAL, margin: "0 auto", borderRadius: 2 },
  roleSwitch: { display: "flex", justifyContent: "center", background: "var(--switch-bg)", padding: 4, borderRadius: 12, width: "fit-content", margin: "0 auto 32px", border: "1px solid #333" },
  roleBtn: { minWidth: 100, padding: "10px 12px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--btn-inactive-text)", transition: "all 0.2s" },
  roleBtnActive: { background: "var(--btn-active-bg)", color: "var(--btn-active-text)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  card: { border: "1px solid var(--border-color)", borderRadius: 16, padding: "clamp(16px, 4vw, 32px)", background: "var(--popup-bg)", boxShadow: "0 12px 40px rgba(0,0,0,0.03)" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "var(--theme-color)", marginBottom: 16, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: 8, lineHeight: "1" },
  grid: { marginBottom: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 },

  label: { fontSize: 13, fontWeight: 600, color: "var(--text-main)", marginBottom: 2 },

  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color, #ddd)", fontSize: 14, background: "var(--field-bg)", outlineColor: ACCENT_TEAL, transition: "border 0.2s", height: 42, boxSizing: "border-box", width: "100%", fontFamily: "inherit", color: "var(--text-main)" },
  select: { padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", fontSize: 14, background: "var(--field-bg)", outlineColor: ACCENT_TEAL, height: 42, width: "100%", color: "var(--text-main)" },
  textarea: { padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", fontSize: 14, resize: "vertical", outlineColor: ACCENT_TEAL, fontFamily: "inherit", color: "var(--text-main)" },

  inline: { display: "flex", gap: 8, flexWrap: "wrap" },
  // Remove outline from inline styles as well to be safe
  pillBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--field-bg)", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "var(--btn-inactive-text)", transition: "0.2s", outline: "none", minWidth: 44, textAlign: "center", whiteSpace: "nowrap" },
  pillBtnActive: { background: ACCENT_TEAL, color: "white", borderColor: ACCENT_TEAL },
  fileWrapper: { position: "relative", width: "100%" },
  fileInput: { opacity: 0, position: "absolute", zIndex: -1, width: "0.1px" },
  fileLabel: { display: "block", textAlign: "center", padding: "12px", borderRadius: 8, border: `1px dashed ${ACCENT_TEAL}`, color: ACCENT_TEAL, fontWeight: 600, cursor: "pointer", fontSize: 13, background: "var(--field-bg)", transition: "0.2s" },
  actions: { display: "flex", justifyContent: "center", marginTop: 32 },
  primaryBtn: { padding: "14px 48px", borderRadius: 30, background: THEME_COLOR, color: "white", cursor: "pointer", fontSize: 16, fontWeight: 700, border: "none", boxShadow: "0 4px 12px rgba(44, 44, 108, 0.2)", transition: "0.2s" },
  inputError: { border: `1px solid ${ACCENT_PINK}` },
  error: { color: ACCENT_PINK, fontSize: 11, fontWeight: 600, marginTop: 2 },
  serverError: {
    color: ACCENT_PINK,
    fontSize: 14,
    fontWeight: 600,
    textAlign: "center",
    padding: "12px 16px",
    background: "#fff5f5",
    borderRadius: 8,
    marginTop: 16,
    border: `1px solid ${ACCENT_PINK}`
  },
  disabled: { background: "rgba(255, 255, 255, 0.14)", cursor: "not-allowed", opacity: 1 },

  calendarPopup: { position: "absolute", top: "105%", right: 0, width: "min(280px, 90vw)", background: "var(--popup-bg)", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", border: "1px solid var(--border-color)", padding: 16, zIndex: 100, color: "var(--text-main)" },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  navBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--btn-inactive-text)", padding: 4 },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 },
  dayName: { textAlign: "center", fontSize: 12, fontWeight: 700, color: "#999", marginBottom: 4 },
  dayBtn: { width: "100%", aspectRatio: "1", borderRadius: "50%", border: "none", background: "var(--field-bg)", cursor: "pointer", fontSize: 13, color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" },
  dayBtnActive: { background: ACCENT_TEAL, color: "white", fontWeight: 700, boxShadow: "0 2px 8px rgba(108, 213, 191, 0.4)" }
};