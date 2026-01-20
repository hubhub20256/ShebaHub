import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profilesAPI } from "../services/api";
import {
  SPECIALTIES_BASE,
  SPECIALTIES_SUPER,
  SPECIALTIES_FELLOWSHIPS,
} from "../data/specialties";

// --- CONSTANTS ---
// REMOVED BRACKETS []
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
  recommendationRequest: "",
  filesUpload: null,
  // contractUpload removed from state logically, though keeping it here doesn't hurt, it won't be used in UI
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
  compensationPreference: "",
  professionalExperience: "",
  isAvailableForResearch: "",
  participationMode: "",
};

export default function CreateMentorProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [role, setRole] = useState("mentor");
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const hasMentorProfile = useMemo(() => user?.has_mentor_profile === true, [user]);
  const hasApprenticeProfile = useMemo(() => user?.has_student_profile === true, [user]);

  // קבע תפקיד ברירת מחדל לפי פרמטרים ולפי מה שכבר קיים
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");

    const requestedRole = roleParam === "apprentice" || roleParam === "mentor" ? roleParam : null;

    // אם כבר קיים פרופיל מהסוג הזה - אל תאפשר ליצור שוב
    if (requestedRole === "mentor" && hasMentorProfile) {
      setRole(hasApprenticeProfile ? "apprentice" : "mentor");
      return;
    }
    if (requestedRole === "apprentice" && hasApprenticeProfile) {
      setRole(hasMentorProfile ? "mentor" : "apprentice");
      return;
    }

    if (requestedRole) {
      setRole(requestedRole);
      setForm(INITIAL_FORM_STATE);
      setErrors({});
      return;
    }

    // אם יש רק אחד קיים - הכריח את השני
    if (hasApprenticeProfile && !hasMentorProfile) {
      setRole("mentor");
      setForm(INITIAL_FORM_STATE);
      setErrors({});
      return;
    }
    if (hasMentorProfile && !hasApprenticeProfile) {
      setRole("apprentice");
      setForm(INITIAL_FORM_STATE);
      setErrors({});
      return;
    }
  }, [location.search, hasApprenticeProfile, hasMentorProfile]);

  // sync role with ?role=mentor|apprentice if navigated from profile toggle
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get("role");
    if (roleParam === "mentor" || roleParam === "apprentice") {
      setRole(roleParam);
      setForm(INITIAL_FORM_STATE);
      setErrors({});
    }
  }, [location.search]);

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
    }));
  }

  function handleFileChange(e) {
    const { name, files } = e.target;
    updateField(name, files && files[0] ? files[0] : null);
  }

  function toggleDegree(deg) {
    setForm((prev) => {
      const exists = prev.degrees.includes(deg);
      const nextDegrees = exists
        ? prev.degrees.filter((x) => x !== deg)
        : [...prev.degrees, deg];
      return { ...prev, degrees: nextDegrees };
    });
  }

  function validate() {
    const next = {};
    if (!form.institution) next.institution = "שדה חובה";
    if (form.degrees.length === 0) next.degrees = "שדה חובה";
    if (!form.personalAcademicDescription.trim()) next.personalAcademicDescription = "שדה חובה";

    if (role === "mentor") {
      if (!form.specialtyGroup) next.specialtyGroup = "שדה חובה";
      if (!form.specialty) next.specialty = "שדה חובה";
      if (!form.workplace.trim()) next.workplace = "שדה חובה";
      if (!form.hasMentoringExperience) next.hasMentoringExperience = "שדה חובה";
    } else {
      if (!form.apprenticeStage) next.apprenticeStage = "שדה חובה";
      if (form.apprenticeStage === "סטודנט" && !form.yearOfStudy) next.yearOfStudy = "שדה חובה";
      if (!form.isAvailableForResearch) next.isAvailableForResearch = "שדה חובה";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const isSpecialtyRelevant =
    role === "mentor" ||
    (form.apprenticeStage !== "סטודנט" && form.apprenticeStage !== "") ||
    (form.apprenticeStage === "סטודנט" && (form.yearOfStudy === "ו'" || form.yearOfStudy === "ז'"));

  const selectedGroup = form.specialtyGroup || "";

  // REMOVED BRACKETS []
  const specialtyOptions = [
    { v: "", t: selectedGroup ? "בחרי/י התמחות" : "קודם בחרי/י קטגוריה" },
    ...((specialtiesByGroup[selectedGroup] || []).map((s) => ({ v: s, t: s }))),
  ];

  // תרגום שגיאות מאנגלית לעברית
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

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError("");

    // פונקציה לסינון ערכים ריקים (שומרת על false כי זה ערך תקין)
    const filterEmpty = (obj) => {
      const filtered = {};
      Object.entries(obj).forEach(([key, value]) => {
        // שמור על false כי זה ערך תקין לשדות boolean
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

      // בניית הנתונים לשליחה
      let profileData = {
        institution: form.institution,
        degrees: form.degrees,
        personalAcademicDescription: form.personalAcademicDescription,
        workplace: form.workplace,
        recommendationRequest: form.recommendationRequest,
      };

      // המרת כן/לא ל-true/false
      const toBoolean = (val) => val === "כן" ? true : val === "לא" ? false : undefined;

      if (role === "mentor") {
        const profileType = "mentor";
        // נתונים ספציפיים למנחה
        profileData = {
          ...profileData,
          specialtyGroup: form.specialtyGroup,
          specialty: form.specialty,
          academicRank: form.academicRank,
          hasMentoringExperience: toBoolean(form.hasMentoringExperience),
          mentoringExperienceDetails: form.mentoringExperienceDetails,
          researchInterests: form.researchInterests,
          previousResearchDescription: form.previousResearchDescription,
        };

        // סינון ערכים ריקים
        profileData = filterEmpty(profileData);

        console.log("Creating mentor profile:", profileData);
        const response = await profilesAPI.createMentorProfile(profileData);
        console.log("Mentor profile created:", response);

        await uploadInitialDocument(profileType);

        // עדכון המשתמש שיש לו פרופיל מנחה
        if (updateUser) {
          updateUser({ has_mentor_profile: true });
        }
      } else {
        const profileType = "student";
        // נתונים ספציפיים לסטודנט/מתלמד
        profileData = {
          ...profileData,
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

        // אם רלוונטי - הוסף התמחות
        if (isSpecialtyRelevant && form.specialty) {
          profileData.specialtyGroup = form.specialtyGroup;
          profileData.specialty = form.specialty;
        }

        // סינון ערכים ריקים
        profileData = filterEmpty(profileData);

        console.log("Creating student profile:", profileData);
        const response = await profilesAPI.createStudentProfile(profileData);
        console.log("Student profile created:", response);

        await uploadInitialDocument(profileType);

        // עדכון המשתמש שיש לו פרופיל סטודנט
        if (updateUser) {
          updateUser({ has_student_profile: true });
        }
      }

      // הודעת הצלחה ומעבר לדף הבית
      alert("הפרופיל נוצר בהצלחה! 🎉");
      navigate("/");
      // החזר את הגלילה לראש העמוד אחרי הניווט כדי להציג את ה-toolbar
      setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }), 0);
    } catch (error) {
      console.error("Profile creation failed:", error);

      if (error.data) {
        console.log("Error data:", error.data);
        console.log("Error details:", JSON.stringify(error.data.details, null, 2));

        // טיפול בשגיאות ספציפיות מהשרת
        if (error.data.code === "CONFLICT") {
          setServerError(translateError(error.data.message));
        } else if (error.data.code === "VALIDATION_ERROR" && error.data.details) {
          // שגיאות ולידציה - הצג את השדות הספציפיים
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
            // גם הצג הודעה כללית
            setServerError("יש שגיאות בטופס, נא לתקן את השדות המסומנים");
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
          // שגיאות בשדות ספציפיים (פורמט ישן)
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
    {/* Dynamic Theme Variables */}
    <style>{`
      :root {
        --switch-bg: #f5f5fa;
        --btn-inactive-text: #666;
        --btn-active-bg: #ffffff;
        --btn-active-text: #2C2C6C;
      }

      /* If your app uses a class like .dark-mode or data-theme='dark' */
      [data-theme='dark'], .dark-mode {
        --switch-bg: #1a1a1a;
        --btn-inactive-text: #aaa;
        --btn-active-bg: #333;
        --btn-active-text: #ffffff;
      }
    `}</style>

    <header style={styles.header}></header>
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

        {/* SECTION 1 */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>פרטים כלליים ושלב הכשרה</h3>
          <div className="mentor-grid" style={styles.grid}>
            {role === "apprentice" && (
              <>
                {/* REMOVED BRACKETS [] */}
                <SelectField label="שלב בהכשרה רפואית" name="apprenticeStage" value={form.apprenticeStage} onChange={handleChange} error={errors.apprenticeStage} options={[{ v: "", t: "בחרי/י שלב" }, { v: "סטודנט", t: "סטודנט" }, { v: "לפני סטאז׳", t: "לפני סטאז׳" }, { v: "סטאז׳ר", t: "סטאז׳ר" }, { v: "אחרי סטאז׳", t: "אחרי סטאז׳" }, { v: "מתמחה", t: "מתמחה" }, { v: "רופא מתמחה", t: "רופא מתמחה" }, { v: "אחר", t: "אחר" }]} />
                <SelectField label="שנת תחילת הלימודים" name="startYear" value={form.startYear} onChange={handleChange} options={[{ v: "", t: "בחרי שנה" }, ...START_YEARS]} />
              </>
            )}

            {role === "apprentice" && form.apprenticeStage === "סטודנט" && (
              <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                <label style={styles.label}>שנת לימודים</label>
                <div style={styles.inline}>
                  {["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'"].map((y) => (
                    // CHANGED: Using styles.pillBtn instead of styles.yearBtn
                    <button key={y} type="button" onClick={() => updateField("yearOfStudy", y)} style={{ ...styles.pillBtn, ...(form.yearOfStudy === y ? styles.pillBtnActive : {}) }}>{y}</button>
                  ))}
                </div>
                {errors.yearOfStudy && <div style={styles.error}>{errors.yearOfStudy}</div>}
              </div>
            )}

            {isSpecialtyRelevant && (
              <>
                <SelectField label="קטגוריית התמחות" name="specialtyGroup" value={form.specialtyGroup} onChange={handleSpecialtyGroupChange} error={errors.specialtyGroup} options={SPECIALTY_GROUPS} />
                <SelectField label="התמחות / תחום מרכזי" name="specialty" value={form.specialty} onChange={handleChange} error={errors.specialty} options={specialtyOptions} disabled={!selectedGroup} />
              </>
            )}

            {/* REMOVED BRACKETS [] */}
            <SelectField label="מוסד לימודים" name="institution" value={form.institution} onChange={handleChange} error={errors.institution} options={[{ v: "", t: "בחרי/י מוסד" }, { v: "האוניברסיטה העברית בירושלים", t: "האוניברסיטה העברית בירושלים" }, { v: "אוניברסיטת תל אביב", t: "אוניברסיטת תל אביב" }, { v: "הטכניון", t: "הטכניון" }, { v: "אוניברסיטת בן גוריון", t: "אוניברסיטת בן גוריון" }, { v: "בר אילן", t: "אוניברסיטת בר אילן" }, { v: "אריאל", t: "אוניברסיטת אריאל" }]} />

            {role === "mentor" && (
              <SelectField label="שלב בהכשרה הרפואית" name="academicRank" value={form.academicRank} onChange={handleChange} options={[{ v: "", t: "בחרי שלב בהכשרה" }, { v: "סטאז׳", t: "סטאז׳" }, { v: "מתמחה", t: "מתמחה" }, { v: "מומחה/ית", t: "מומחה/ית" }, { v: "התמחות־על / עמית/ת", t: "התמחות־על / עמית/ת" }]} />
            )}
          </div>
        </div>

        {/* SECTION 2 */}
        <div style={{ ...styles.section, borderTop: "1px solid #eee", paddingTop: 24 }}>
          <h3 style={styles.sectionTitle}>ניסיון ומקום עבודה</h3>
          <div className="mentor-grid" style={styles.grid}>
            <InputField label="מקום עבודה" name="workplace" value={form.workplace} onChange={handleChange} error={role === "mentor" ? errors.workplace : null} placeholder={role === "mentor" ? "מקום העבודה" : "מקום עבודה (אם רלוונטי)"} />

            {role === "apprentice" && (
              <div style={styles.field}>
                <label style={styles.label}>האם את/ה מועסק בשיבא?</label>
                <div style={styles.inline}>
                  {["כן", "לא"].map((opt) => (
                    <button key={opt} type="button" onClick={() => updateField("isShebaEmployee", opt)} style={{ ...styles.pillBtn, ...(form.isShebaEmployee === opt ? styles.pillBtnActive : {}) }}>{opt}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DegreesField label="תארים" name="degrees" value={form.degrees} onToggle={toggleDegree} error={errors.degrees} options={["MD", "PhD", "MSc", "MPH", "MBA"]} />

          {role === "mentor" ? (
            <div style={{ marginTop: 15 }}>
              <div style={styles.field}>
                <label style={styles.label}>ניסיון בהנחיה <span style={{ color: ACCENT_PINK }}>*</span></label>
                <div style={styles.inline}>
                  {["כן", "לא"].map((opt) => (
                    <button key={opt} type="button" onClick={() => updateField("hasMentoringExperience", opt)} style={{ ...styles.pillBtn, ...(form.hasMentoringExperience === opt ? styles.pillBtnActive : {}), ...(errors.hasMentoringExperience ? { borderColor: ACCENT_PINK } : {}) }}>{opt}</button>
                  ))}
                </div>
                {errors.hasMentoringExperience && <div style={styles.error}>{errors.hasMentoringExperience}</div>}
                <div style={{ marginTop: 10 }}>
                  <InputField label="פירוט ניסיון בהנחיה" name="mentoringExperienceDetails" value={form.mentoringExperienceDetails} onChange={handleChange} disabled={form.hasMentoringExperience !== "כן"} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 15 }}>
              <div style={styles.field}>
                <label style={styles.label}>ניסיון במחקר</label>
                <div style={styles.inline}>
                  {["כן", "לא"].map((opt) => (
                    <button key={opt} type="button" onClick={() => updateField("hasResearchExperience", opt)} style={{ ...styles.pillBtn, ...(form.hasResearchExperience === opt ? styles.pillBtnActive : {}) }}>{opt}</button>
                  ))}
                </div>
                {form.hasResearchExperience === "כן" && <TextAreaField label="פירוט ניסיון מחקרי" name="researchExperienceDetails" value={form.researchExperienceDetails} onChange={handleChange} rows={3} />}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3 */}
        <div style={{ ...styles.section, borderTop: "1px solid #eee", paddingTop: 24 }}>
          {/* CHANGED TITLE FOR MENTOR */}
          <h3 style={styles.sectionTitle}>
            {role === "mentor" ? "רקע מחקרי ותחומי עניין" : "מחקר וזמינות"}
          </h3>

          {role === "apprentice" ? (
            <>
              <div className="mentor-grid" style={styles.grid}>
                {/* REMOVED BRACKETS [] */}
                <SelectField label="סוג העבודה המבוקשת" name="workType" value={form.workType} onChange={handleChange} options={[{ v: "", t: "בחרי עבודה" }, { v: "איסוף נתונים", t: "איסוף נתונים" }, { v: "כתיבה מדעית", t: "כתיבה מדעית" }, { v: "ניתוח סטטיסטי", t: "ניתוח סטטיסטי" }]} />
                <SelectField label="העדפת תגמול" name="compensationPreference" value={form.compensationPreference} onChange={handleChange} options={[{ v: "", t: "בחרי סוג תגמול" }, { v: "מלגה", t: "מלגה" }, { v: "שכר", t: "שכר" }, { v: "קרדיט אקדמי", t: "קרדיט אקדמי" }, { v: "ללא תגמול / התנדבות", t: "ללא תגמול / התנדבות" }]} />
                <SelectField label="אופן ההשתתפות" name="participationMode" value={form.participationMode} onChange={handleChange} options={[{ v: "", t: "בחרי מיקום" }, { v: "פרונטלי", t: "פרונטלי" }, { v: "מרחוק", t: "מרחוק" }, { v: "היברידי", t: "היברידי" }]} />

                <div style={styles.field}>
                  <label style={styles.label}>זמינות למחקר</label>
                  <div style={styles.inline}>
                    {["כן", "לא"].map((opt) => (
                      <button key={opt} type="button" onClick={() => updateField("isAvailableForResearch", opt)} style={{ ...styles.pillBtn, ...(form.isAvailableForResearch === opt ? styles.pillBtnActive : {}) }}>{opt}</button>
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
                {/* REMOVED BRACKETS [] */}
                <SelectField label="תחומי עניין מחקר" name="researchInterests" value={form.researchInterests} onChange={handleChange} options={[{ v: "", t: "בחרי/י תחומים" }, { v: "AI ברפואה", t: "AI ברפואה" }, { v: "אפידמיולוגיה", t: "אפידמיולוגיה" }, { v: "רפואה דחופה", t: "רפואה דחופה" }, { v: "מחקר קליני", t: "מחקר קליני" }]} />
              </div>
              <TextAreaField label="תיאור מחקרים קודמים" name="previousResearchDescription" value={form.previousResearchDescription} onChange={handleChange} />
            </>
          )}
        </div>

        {/* SECTION 4 */}
        <div style={{ ...styles.section, borderTop: "1px solid #eee", paddingTop: 24 }}>
          <h3 style={styles.sectionTitle}>פרטים נוספים וקבצים</h3>
          <TextAreaField label="תיאור רקע אישי ואקדמי" name="personalAcademicDescription" value={form.personalAcademicDescription} onChange={handleChange} error={errors.personalAcademicDescription} rows={4} />
          <TextAreaField label="לקבלת חוות דעת ממנחים/מתלמדים" name="recommendationRequest" value={form.recommendationRequest} onChange={handleChange} placeholder="תואר + שם מלא + דואר אלקטרוני" rows={4} />

          <div className="mentor-grid" style={{ ...styles.grid, marginTop: 15 }}>
            <FileField label="העלאת קבצים (אופציונלי)" name="filesUpload" file={form.filesUpload} onChange={handleFileChange} />
            {/* REMOVED CONTRACT UPLOAD */}
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
          @media (min-width: 768px) { 
            .mentor-grid { grid-template-columns: 1fr 1fr; } 
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

function DatePickerField({ label, value, onChange }) {
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
    // Format as ISO date (YYYY-MM-DD) for backend compatibility
    const isoDate = d.toISOString().split('T')[0];
    onChange(isoDate);
    setShow(false);
  };

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));

  // Format ISO date (YYYY-MM-DD) for display as DD/MM/YYYY
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
            <span style={{ fontWeight: 700, color: THEME_COLOR }}>{getMonthName(currentDate)}</span>
            <button type="button" onClick={prevMonth} style={styles.navBtn}>&gt;</button>
          </div>
          <div style={styles.calendarGrid}>
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => <div key={d} style={styles.dayName}>{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = value && parseInt(value.split('/')[0]) === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  style={{
                    ...styles.dayBtn,
                    ...(isSelected ? styles.dayBtnActive : {})
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

function FileField({ label, name, file, onChange }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.fileWrapper}>
        <input type="file" name={name} onChange={onChange} style={styles.fileInput} id={name} />
        <label htmlFor={name} style={styles.fileLabel} className="create-profile-file-label">
          {file ? `✅ ${file.name}` : "בחרי קובץ..."}
        </label>
      </div>
    </div>
  );
}

// --- STYLES ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";

const styles = {
  page: { maxWidth: 800, margin: "0 auto", padding: "40px 16px", fontFamily: "Rubik, system-ui, sans-serif", color: THEME_COLOR },
  header: { textAlign: "center", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  titleUnderline: { width: 50, height: 4, background: ACCENT_TEAL, margin: "0 auto", borderRadius: 2 },
  roleSwitch: { display: "flex", justifyContent: "center", background: "var(--switch-bg)", padding: 4, borderRadius: 12, width: "fit-content", margin: "0 auto 32px", border: "1px solid #333" },
  roleBtn: { minWidth: 120, padding: "10px 16px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", fontSize: 15, fontWeight: 600, color: "var(--btn-inactive-text)", transition: "all 0.2s" },
  roleBtnActive: { background: "var(--btn-active-bg)", color: "var(--btn-active-text)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  card: { border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "32px", background: "white", boxShadow: "0 12px 40px rgba(0,0,0,0.03)" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: THEME_COLOR, marginBottom: 16, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: 8, lineHeight: "1" },
  grid: { marginBottom: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 },

  label: { fontSize: 13, fontWeight: 600, color: "#000000", marginBottom: 2 },

  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outlineColor: ACCENT_TEAL, transition: "border 0.2s", height: 42, boxSizing: "border-box", width: "100%", fontFamily: "inherit", color: "#555" },
  select: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "#fff", outlineColor: ACCENT_TEAL, height: 42, width: "100%", color: "#555" },
  textarea: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, resize: "vertical", outlineColor: ACCENT_TEAL, fontFamily: "inherit", color: "#555" },

  inline: { display: "flex", gap: 8, flexWrap: "wrap" },
  pillBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid #eee", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#666", transition: "0.2s" },
  pillBtnActive: { background: ACCENT_TEAL, color: "white", borderColor: ACCENT_TEAL },
  fileWrapper: { position: "relative", width: "100%" },
  fileInput: { opacity: 0, position: "absolute", zIndex: -1, width: "0.1px" },
  fileLabel: { display: "block", textAlign: "center", padding: "12px", borderRadius: 8, border: `1px dashed ${ACCENT_TEAL}`, color: ACCENT_TEAL, fontWeight: 600, cursor: "pointer", fontSize: 13, background: "#fafffe", transition: "0.2s" },
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

  calendarPopup: { position: "absolute", top: "105%", right: 0, width: "280px", background: "white", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", border: "1px solid #eee", padding: 16, zIndex: 100 },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  navBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#666", padding: 4 },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 },
  dayName: { textAlign: "center", fontSize: 12, fontWeight: 700, color: "#999", marginBottom: 4 },
  dayBtn: { width: "100%", aspectRatio: "1", borderRadius: "50%", border: "none", background: "white", cursor: "pointer", fontSize: 13, color: "#333", display: "flex", alignItems: "center", justifyContent: "center", transition: "0.2s" },
  dayBtnActive: { background: ACCENT_TEAL, color: "white", fontWeight: 700, boxShadow: "0 2px 8px rgba(108, 213, 191, 0.4)" }
};