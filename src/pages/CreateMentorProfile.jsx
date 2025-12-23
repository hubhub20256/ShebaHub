import React, { useState } from "react";
import {
  SPECIALTIES_BASE,
  SPECIALTIES_SUPER,
  SPECIALTIES_FELLOWSHIPS,
} from "../data/specialties";

const SPECIALTY_GROUPS = [
  { v: "", t: "[ בחרי/י קטגוריה ]" },
  { v: "base", t: "מקצועות הבסיס" },
  { v: "super", t: "מקצועות העל" },
  { v: "fellows", t: "השתלמויות עמיתים" },
];

const specialtiesByGroup = {
  base: SPECIALTIES_BASE,
  super: SPECIALTIES_SUPER,
  fellows: SPECIALTIES_FELLOWSHIPS,
};

const currentYear = new Date().getFullYear();
const START_YEARS = Array.from({ length: 11 }, (_, i) => ({
  v: (currentYear - i).toString(),
  t: (currentYear - i).toString(),
}));

export default function CreateMentorProfile() {
  const [role, setRole] = useState("mentor");

  const [form, setForm] = useState({
    specialtyGroup: "",
    specialty: "",
    stageInMedicalTraining: "",
    workplace: "",
    isShebaEmployee: "", // שדה חדש
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
  });

  const [errors, setErrors] = useState({});

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
  const specialtyOptions = [
    { v: "", t: selectedGroup ? "[ בחרי/י התמחות ]" : "[ קודם בחרי/י קטגוריה ]" },
    ...((specialtiesByGroup[selectedGroup] || []).map((s) => ({ v: s, t: s }))),
  ];

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    console.log("role:", role, "payload:", form);
    alert("נשמר לבדיקה (Console).");
  }

  return (
    <div dir="rtl" style={styles.page}>
      <h1 style={styles.title}>יצירת פרופיל</h1>

      <div style={styles.roleSwitch}>
        <button type="button" onClick={() => setRole("mentor")} style={{ ...styles.roleBtn, ...(role === "mentor" ? styles.roleBtnActive : {}) }}>מנחה</button>
        <button type="button" onClick={() => setRole("apprentice")} style={{ ...styles.roleBtn, ...(role === "apprentice" ? styles.roleBtnActive : {}) }}>מתלמד/ת</button>
      </div>

      <form onSubmit={submit} style={styles.card}>
        <div className="mentor-grid" style={styles.grid}>
          
          {role === "apprentice" && (
            <>
              <SelectField
                label="שלב בהכשרה רפואית"
                name="apprenticeStage"
                value={form.apprenticeStage}
                onChange={handleChange}
                error={errors.apprenticeStage}
                options={[
                  { v: "", t: "[ בחרי/י שלב ]" },
                  { v: "סטודנט", t: "סטודנט" },
                  { v: "לפני סטאז׳", t: "לפני סטאז׳" },
                  { v: "סטאז׳ר", t: "סטאז׳ר" },
                  { v: "אחרי סטאז׳", t: "אחרי סטאז׳" },
                  { v: "מתמחה", t: "מתמחה" },
                  { v: "רופא מתמחה", t: "רופא מתמחה" },
                  { v: "אחר", t: "אחר" },
                ]}
              />
              
              <SelectField label="שנת תחילת הלימודים" name="startYear" value={form.startYear} onChange={handleChange} options={[{ v: "", t: "[ בחרי שנה ]" }, ...START_YEARS]} />

              {form.apprenticeStage === "סטודנט" && (
                <div style={styles.field}>
                  <label style={styles.label}>שנת לימודים</label>
                  <div style={styles.inline}>
                    {["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ז'"].map((y) => (
                      <button key={y} type="button" onClick={() => updateField("yearOfStudy", y)} style={{ ...styles.yearBtn, ...(form.yearOfStudy === y ? styles.pillBtnActive : {}) }}>{y}</button>
                    ))}
                  </div>
                  {errors.yearOfStudy && <div style={styles.error}>{errors.yearOfStudy}</div>}
                </div>
              )}
            </>
          )}

          {isSpecialtyRelevant && (
            <>
              <SelectField label="קטגוריית התמחות" name="specialtyGroup" value={form.specialtyGroup} onChange={handleSpecialtyGroupChange} error={errors.specialtyGroup} options={SPECIALTY_GROUPS} />
              <SelectField label="התמחות / תחום מרכזי" name="specialty" value={form.specialty} onChange={handleChange} error={errors.specialty} options={specialtyOptions} disabled={!selectedGroup} />
            </>
          )}

          {role === "mentor" && (
            <>
              <InputField label="מקום עבודה" name="workplace" value={form.workplace} onChange={handleChange} error={errors.workplace} placeholder="תפרטי/י על מקום העבודה" />
            </>
          )}

          <SelectField
            label="מוסד לימודים"
            name="institution"
            value={form.institution}
            onChange={handleChange}
            error={errors.institution}
            options={[
              { v: "", t: "[ בחרי/י מוסד ]" },
              { v: "האוניברסיטה העברית בירושלים", t: "האוניברסיטה העברית בירושלים" },
              { v: "אוניברסיטת תל אביב", t: "אוניברסיטת תל אביב" },
              { v: "הטכניון", t: "הטכניון" },
              { v: "אוניברסיטת בן גוריון", t: "אוניברסיטת בן גוריון" },
              { v: "בר אילן", t: "אוניברסיטת בר אילן" },
              { v: "אריאל", t: "אוניברסיטת אריאל" },
            ]}
          />

          {/* שדות חדשים למתלמד אחרי מוסד לימודים */}
          {role === "apprentice" && (
            <>
              <InputField label="מקום עבודה" name="workplace" value={form.workplace} onChange={handleChange} placeholder="מקום עבודה (אם רלוונטי)" />
              <div style={styles.field}>
                <label style={styles.label}>האם את/ה מועסק בשיבא?</label>
                <div style={styles.inline}>
                  <button type="button" onClick={() => updateField("isShebaEmployee", "כן")} style={{ ...styles.pillBtn, ...(form.isShebaEmployee === "כן" ? styles.pillBtnActive : {}) }}>כן</button>
                  <button type="button" onClick={() => updateField("isShebaEmployee", "לא")} style={{ ...styles.pillBtn, ...(form.isShebaEmployee === "לא" ? styles.pillBtnActive : {}) }}>לא</button>
                </div>
              </div>
            </>
          )}

          {role === "mentor" && (
            <SelectField
              label="שלב בהכשרה הרפואית"
              name="academicRank"
              value={form.academicRank}
              onChange={handleChange}
              options={[ { v: "", t: "בחרי שלב בהכשרה" }, { v: "סטאז׳", t: "סטאז׳" }, { v: "מתמחה", t: "מתמחה" }, { v: "מומחה/ית", t: "מומחה/ית" }, { v: "התמחות־על / עמית/ת", t: "התמחות־על / עמית/ת" },
              ]}
            />
          )}

          {role === "apprentice" && (
            <>
              <SelectField
                label="סוג העבודה המבוקשת"
                name="workType"
                value={form.workType}
                onChange={handleChange}
                options={[
                  { v: "", t: "[ בחרי עבודה ]" },
                  { v: "איסוף נתונים", t: "איסוף נתונים" },
                  { v: "כתיבה מדעית", t: "כתיבה מדעית" },
                  { v: "ניתוח סטטיסטי", t: "ניתוח סטטיסטי" },
                ]}
              />
              <SelectField
                label="העדפת תגמול"
                name="compensationPreference"
                value={form.compensationPreference}
                onChange={handleChange}
                options={[
                  { v: "", t: "[ בחרי סוג תגמול ]" },
                  { v: "מלגה", t: "מלגה" },
                  { v: "שכר", t: "שכר" },
                  { v: "קרדיט אקדמי", t: "קרדיט אקדמי" },
                  { v: "ללא תגמול / התנדבות", t: "ללא תגמול / התנדבות" },
                ]}
              />
              <SelectField
                label="אופן ההשתתפות"
                name="participationMode"
                value={form.participationMode}
                onChange={handleChange}
                options={[
                  { v: "", t: "[ בחרי מיקום ]" },
                  { v: "פרונטלי", t: "פרונטלי" },
                  { v: "מרחוק", t: "מרחוק" },
                  { v: "היברידי", t: "היברידי" },
                ]}
              />
            </>
          )}
        </div>

        <DegreesField label="תארים" name="degrees" value={form.degrees} onToggle={toggleDegree} error={errors.degrees} options={["MD", "PhD", "MSc", "MPH", "MBA"]} />

        {role === "mentor" ? (
          <div style={styles.field}>
            <label style={styles.label}>ניסיון בהנחיה</label>
            <div style={styles.inline}>
              <button type="button" onClick={() => updateField("hasMentoringExperience", "כן")} style={{ ...styles.pillBtn, ...(form.hasMentoringExperience === "כן" ? styles.pillBtnActive : {}) }}>כן</button>
              <button type="button" onClick={() => updateField("hasMentoringExperience", "לא")} style={{ ...styles.pillBtn, ...(form.hasMentoringExperience === "לא" ? styles.pillBtnActive : {}) }}>לא</button>
            </div>
            <InputField label="פירוט ניסיון בהנחיה" name="mentoringExperienceDetails" value={form.mentoringExperienceDetails} onChange={handleChange} disabled={form.hasMentoringExperience !== "כן"} />
          </div>
        ) : (
          <>
            <div style={styles.field}>
              <label style={styles.label}>ניסיון במחקר</label>
              <div style={styles.inline}>
                <button type="button" onClick={() => updateField("hasResearchExperience", "כן")} style={{ ...styles.pillBtn, ...(form.hasResearchExperience === "כן" ? styles.pillBtnActive : {}) }}>כן</button>
                <button type="button" onClick={() => updateField("hasResearchExperience", "לא")} style={{ ...styles.pillBtn, ...(form.hasResearchExperience === "לא" ? styles.pillBtnActive : {}) }}>לא</button>
              </div>
              {form.hasResearchExperience === "כן" && <TextAreaField label="פירוט ניסיון מחקרי" name="researchExperienceDetails" value={form.researchExperienceDetails} onChange={handleChange} rows={3} />}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>זמינות למחקר</label>
              <div style={styles.inline}>
                <button type="button" onClick={() => updateField("isAvailableForResearch", "כן")} style={{ ...styles.pillBtn, ...(form.isAvailableForResearch === "כן" ? styles.pillBtnActive : {}) }}>כן</button>
                <button type="button" onClick={() => updateField("isAvailableForResearch", "לא")} style={{ ...styles.pillBtn, ...(form.isAvailableForResearch === "לא" ? styles.pillBtnActive : {}) }}>לא</button>
              </div>
              {errors.isAvailableForResearch && <div style={styles.error}>{errors.isAvailableForResearch}</div>}
            </div>

            <TextAreaField label="מיומנויות בתוכנות ובכלי עבודה" name="softwareSkills" value={form.softwareSkills} onChange={handleChange} placeholder="למשל: SPSS, Python, Excel..." rows={2} />
            <TextAreaField label="ניסיון מקצועי קודם" name="professionalExperience" value={form.professionalExperience} onChange={handleChange} placeholder="תאר/י ניסיון רלוונטי..." rows={2} />
          </>
        )}

        {role === "mentor" && (
          <>
            <SelectField label="תחומי עניין מחקר" name="researchInterests" value={form.researchInterests} onChange={handleChange} options={[
            { v: "", t: "[ בחרי/י תחומים ]" },
            { v: "AI ברפואה", t: "AI ברפואה" },
            { v: "אפידמיולוגיה", t: "אפידמיולוגיה" },
            { v: "רפואה דחופה", t: "רפואה דחופה" },
            { v: "מחקר קליני", t: "מחקר קליני" },
          ]}
        />
            <TextAreaField label="תיאור מחקרים קודמים" name="previousResearchDescription" value={form.previousResearchDescription} onChange={handleChange} />
          </>
        )}

        {role === "apprentice" && (
          <div style={styles.grid}>
             <InputField label="היקף שעות שבועי" name="weeklyHours" value={form.weeklyHours} onChange={handleChange} placeholder="מספר בלבד" />
             <InputField label="זמינות להתחלה" name="startDate" value={form.startDate} onChange={handleChange} placeholder="DD/MM/YY" />
          </div>
        )}

        <TextAreaField label="תיאור רקע אישי ואקדמי" name="personalAcademicDescription" value={form.personalAcademicDescription} onChange={handleChange} error={errors.personalAcademicDescription} rows={4} />
        
        <InputField label="לקבלת חוות דעת ממנחים ומתלמדים" name="recommendationRequest" value={form.recommendationRequest} onChange={handleChange} placeholder="תציין/י תואר אקדמי + שם מלא + דואר אלקטרוני" />

        <FileField label="העלאת קבצים" name="filesUpload" file={form.filesUpload} onChange={handleFileChange} />
        {role === "mentor" && <FileField label="העלאת חוזה" name="contractUpload" file={form.contractUpload} onChange={handleFileChange} />}

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryBtn}>אישור</button>
        </div>

        <style>{` @media (min-width: 900px) { .mentor-grid { grid-template-columns: 1fr 1fr; } } `}</style>
      </form>
    </div>
  );
}

function InputField({ label, name, value, onChange, placeholder, disabled, error }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} style={{ ...styles.input, ...(disabled ? styles.disabled : {}), ...(error ? styles.inputError : {}) }} />
      {error && <div style={styles.error}>{error}</div>}
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
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.checkboxGrid}>
        {options.map((opt) => (
          <label key={opt} style={styles.checkboxItem}>
            <input type="checkbox" checked={value.includes(opt)} onChange={() => onToggle(opt)} />
            <span>{opt}</span>
          </label>
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
      <input type="file" name={name} onChange={onChange} />
      <div style={styles.fileHint}>{file ? `נבחר: ${file.name}` : "לא נבחר קובץ"}</div>
    </div>
  );
}

const THEME_COLOR = "#2C2C6C";
const styles = {
  page: { maxWidth: 980, margin: "0 auto", padding: "24px 16px 40px" },
  title: { fontSize: 34, fontWeight: 800, textAlign: "center", color: THEME_COLOR, marginBottom: 18 },
  roleSwitch: { display: "flex", justifyContent: "center", gap: 14, marginBottom: 18 },
  roleBtn: { minWidth: 160, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.18)", background: "white", cursor: "pointer", fontSize: 16, fontWeight: 700, color: THEME_COLOR },
  roleBtnActive: { background: THEME_COLOR, color: "white", border: `1px solid ${THEME_COLOR}` },
  card: { border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14, padding: 18, background: "white" },
  grid: { display: "grid", gap: 12, gridTemplateColumns: "1fr", marginBottom: 8 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  label: { fontSize: 14, fontWeight: 700, color: THEME_COLOR },
  input: { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)", fontSize: 14, height: 44 },
  select: { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)", fontSize: 14, height: 44, background: "white" },
  textarea: { padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)", fontSize: 14, resize: "vertical" },
  inline: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  pillBtn: { minWidth: 64, padding: "8px 12px", borderRadius: 10, border: `1px solid rgba(0,0,0,0.18)`, background: "white", cursor: "pointer", fontWeight: 700, color: THEME_COLOR },
  pillBtnActive: { background: THEME_COLOR, color: "white" },
  yearBtn: { width: "40px", height: "40px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.18)", background: "white", cursor: "pointer", fontWeight: "700" },
  checkboxGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 },
  checkboxItem: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)" },
  actions: { display: "flex", justifyContent: "center", marginTop: 18 },
  primaryBtn: { padding: "10px 18px", borderRadius: 14, background: THEME_COLOR, color: "white", cursor: "pointer", minWidth: 180, fontSize: 16, fontWeight: 800, border: "none" },
  fileHint: { fontSize: 13, opacity: 0.7, marginTop: 4 },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
  inputError: { border: "1px solid red" },
  error: { color: "red", fontSize: 12 }
};