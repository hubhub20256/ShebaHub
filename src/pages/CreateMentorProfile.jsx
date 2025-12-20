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

export default function CreateMentorProfile() {
  const [role, setRole] = useState("mentor");

  const [form, setForm] = useState({
    specialtyGroup: "",
    specialty: "",
    stageInMedicalTraining: "",
    workplace: "",
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

    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.specialtyGroup;
      delete copy.specialty;
      return copy;
    });
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

    setErrors((prev) => {
      if (!prev.degrees) return prev;
      const copy = { ...prev };
      delete copy.degrees;
      return copy;
    });
  }

  function validate() {
    const next = {};

    if (!form.specialtyGroup) next.specialtyGroup = "שדה חובה";
    if (!form.specialty) next.specialty = "שדה חובה";

    if (!form.stageInMedicalTraining) next.stageInMedicalTraining = "שדה חובה";
    if (!form.workplace.trim()) next.workplace = "שדה חובה";
    if (!form.degrees || form.degrees.length === 0) next.degrees = "שדה חובה";
    if (!form.institution) next.institution = "שדה חובה";
    if (!form.academicRank) next.academicRank = "שדה חובה";

    if (!form.hasMentoringExperience) next.hasMentoringExperience = "שדה חובה";
    if (form.hasMentoringExperience === "כן" && !form.mentoringExperienceDetails.trim()) {
      next.mentoringExperienceDetails = "נא לפרט ניסיון בהנחיה";
    }

    if (!form.researchInterests) next.researchInterests = "שדה חובה";
    if (!form.previousResearchDescription.trim()) next.previousResearchDescription = "שדה חובה";
    if (!form.personalAcademicDescription.trim()) next.personalAcademicDescription = "שדה חובה";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    console.log("role:", role);
    console.log("payload:", form);
    alert("נשמר לבדיקה (Console). בשלב הבא נחבר ל-API.");
  }

  const selectedGroup = form.specialtyGroup || "";
  const specialtyOptions = [
    { v: "", t: selectedGroup ? "[ בחרי/י התמחות ]" : "[ קודם בחרי/י קטגוריה ]" },
    ...((specialtiesByGroup[selectedGroup] || []).map((s) => ({ v: s, t: s }))),
  ];

  return (
    <div dir="rtl" style={styles.page}>
      <h1 style={styles.title}>יצירת פרופיל</h1>

      <div style={styles.roleSwitch}>
        <button
          type="button"
          onClick={() => setRole("mentor")}
          style={{ ...styles.roleBtn, ...(role === "mentor" ? styles.roleBtnActive : {}) }}
        >
          מנחה
        </button>

        <button
          type="button"
          onClick={() => setRole("apprentice")}
          style={{ ...styles.roleBtn, ...(role === "apprentice" ? styles.roleBtnActive : {}) }}
        >
          מתלמד/ת
        </button>
      </div>

      <form onSubmit={submit} style={styles.card}>
        <div className="mentor-grid" style={styles.grid}>
          <SelectField
            label="קטגוריית התמחות"
            name="specialtyGroup"
            value={form.specialtyGroup}
            onChange={handleSpecialtyGroupChange}
            error={errors.specialtyGroup}
            options={SPECIALTY_GROUPS}
          />

          <SelectField
            label="התמחות / תחום מרכזי"
            name="specialty"
            value={form.specialty}
            onChange={handleChange}
            error={errors.specialty}
            options={specialtyOptions}
            disabled={!selectedGroup}
          />

          <SelectField
            label="שלב בהכשרה הרפואית"
            name="stageInMedicalTraining"
            value={form.stageInMedicalTraining}
            onChange={handleChange}
            error={errors.stageInMedicalTraining}
            options={[
              { v: "", t: "[ בחרי/י שלב בהכשרה ]" },
              { v: "מתמחה/ית", t: "מתמחה/ית" },
              { v: "מומחה/ית", t: "מומחה/ית" },
              { v: "עמית/ה", t: "עמית/ה" },
            ]}
          />

          <InputField
            label="מקום עבודה"
            name="workplace"
            value={form.workplace}
            onChange={handleChange}
            error={errors.workplace}
            placeholder="תפרטי/י על מקום העבודה"
          />

          <DegreesField
            label="תארים"
            name="degrees"
            value={form.degrees}
            onToggle={toggleDegree}
            error={errors.degrees}
            options={["MD", "PhD", "MSc", "MPH", "MBA"]}
          />

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
              { v: "אוניברסיטת בן-גוריון בנגב", t: "אוניברסיטת בן-גוריון בנגב" },
              { v: "אוניברסיטת בר-אילן", t: "אוניברסיטת בר-אילן" },
              { v: "אוניברסיטת אריאל", t: "אוניברסיטת אריאל" },
              { v: "הטכניון – מכון טכנולוגי לישראל", t: "הטכניון – מכון טכנולוגי לישראל" },
            ]}
          />

          <SelectField
            label="שלב בהכשרה הרפואית"
            name="academicRank"
            value={form.academicRank}
            onChange={handleChange}
            error={errors.academicRank}
            options={[
              { v: "", t: "בחרי שלב בהכשרה" },
              { v: "סטאז׳", t: "סטאז׳" },
              { v: "מתמחה", t: "מתמחה" },
              { v: "מומחה/ית", t: "מומחה/ית" },
              { v: "התמחות־על / עמית/ת", t: "התמחות־על / עמית/ת" },
            ]}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>ניסיון בהנחיה</label>

          <div style={styles.inline}>
            <button
              type="button"
              onClick={() => updateField("hasMentoringExperience", "כן")}
              style={{
                ...styles.pillBtn,
                ...(form.hasMentoringExperience === "כן" ? styles.pillBtnActive : {}),
              }}
            >
              כן
            </button>

            <button
              type="button"
              onClick={() => updateField("hasMentoringExperience", "לא")}
              style={{
                ...styles.pillBtn,
                ...(form.hasMentoringExperience === "לא" ? styles.pillBtnActive : {}),
              }}
            >
              לא
            </button>
          </div>

          {errors.hasMentoringExperience ? (
            <div style={styles.error}>{errors.hasMentoringExperience}</div>
          ) : null}
        </div>

        <InputField
          label="פירוט ניסיון בהנחיה"
          name="mentoringExperienceDetails"
          value={form.mentoringExperienceDetails}
          onChange={handleChange}
          error={errors.mentoringExperienceDetails}
          placeholder="תפרטי/י על הניסיון בהנחיה"
          disabled={form.hasMentoringExperience !== "כן"}
        />

        <SelectField
          label="תחומי עניין מחקר"
          name="researchInterests"
          value={form.researchInterests}
          onChange={handleChange}
          error={errors.researchInterests}
          options={[
            { v: "", t: "[ בחרי/י תחומים ]" },
            { v: "AI ברפואה", t: "AI ברפואה" },
            { v: "אפידמיולוגיה", t: "אפידמיולוגיה" },
            { v: "רפואה דחופה", t: "רפואה דחופה" },
            { v: "מחקר קליני", t: "מחקר קליני" },
          ]}
        />

        <TextAreaField
          label="תיאור מחקרים קודמים"
          name="previousResearchDescription"
          value={form.previousResearchDescription}
          onChange={handleChange}
          error={errors.previousResearchDescription}
          placeholder="תספר/י על המחקרים"
          rows={4}
        />

        <TextAreaField
          label="תיאור רקע אישי ואקדמי"
          name="personalAcademicDescription"
          value={form.personalAcademicDescription}
          onChange={handleChange}
          error={errors.personalAcademicDescription}
          placeholder="תספר/י על עצמך"
          rows={4}
        />

        <InputField
          label="לקבלת חוות דעת ממנחים ומתלמדים"
          name="recommendationRequest"
          value={form.recommendationRequest}
          onChange={handleChange}
          error={errors.recommendationRequest}
          placeholder="תציין/י תואר אקדמי + שם מלא + דואר אלקטרוני"
        />


        <FileField
          label="העלאת קבצים"
          name="filesUpload"
          file={form.filesUpload}
          onChange={handleFileChange}
        />

        <FileField
          label="העלאת חוזה"
          name="contractUpload"
          file={form.contractUpload}
          onChange={handleFileChange}
        />

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryBtn}>
            אישור
          </button>
        </div>

        <style>{`
          @media (min-width: 900px) {
            .mentor-grid { grid-template-columns: 1fr 1fr; }
          }
        `}</style>
      </form>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={styles.sectionTitle}>{children}</h2>;
}

function InputField({ label, name, value, onChange, error, placeholder, disabled }) {
  return (
    <div style={styles.field}>
      <label htmlFor={name} style={styles.label}>{label}</label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          ...styles.input,
          ...(error ? styles.inputError : {}),
          ...(disabled ? styles.disabled : {}),
        }}
      />
      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  error,
  options,
  multiple = false,
  disabled = false,
}) {
  const normalizedValue = multiple
    ? Array.isArray(value)
      ? value
      : []
    : value ?? "";

  return (
    <div style={styles.field}>
      <label htmlFor={name} style={styles.label}>{label}</label>

      <select
        id={name}
        name={name}
        value={normalizedValue}
        onChange={onChange}
        multiple={multiple}
        disabled={disabled}
        style={{
          ...styles.select,
          ...(multiple ? { height: "auto", minHeight: 110 } : {}),
          ...(error ? styles.inputError : {}),
          ...(disabled ? styles.disabled : {}),
        }}
      >
        {/* {!multiple && <option value="">[ בחרי/י ]</option>} */}

        {options.map((o) => (
          <option key={`${name}-${o.v}`} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>

      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}

function DegreesField({ label, name, value, onToggle, error, options }) {
  const selected = Array.isArray(value) ? value : [];

  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>

      <div style={styles.checkboxGrid}>
        {options.map((opt) => {
          const checked = selected.includes(opt);

          return (
            <label key={`${name}-${opt}`} style={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(opt)}
                style={styles.checkbox}
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, error, placeholder, rows }) {
  return (
    <div style={styles.field}>
      <label htmlFor={name} style={styles.label}>{label}</label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{ ...styles.textarea, ...(error ? styles.inputError : {}) }}
      />
      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}

function FileField({ label, name, file, onChange }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input id={name} name={name} type="file" onChange={onChange} style={styles.fileInput} />
      <div style={styles.fileHint}>{file ? `נבחר קובץ: ${file.name}` : "לא נבחר קובץ"}</div>
    </div>
  );
}

const THEME_COLOR = "#2C2C6C";

const styles = {
  page: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "24px 16px 40px",
  },
  title: {
    margin: "0 0 14px",
    fontSize: 34,
    fontWeight: 800,
    textAlign: "center",
    color: THEME_COLOR,
  },
  roleSwitch: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    marginBottom: 18,
  },
  roleBtn: {
    minWidth: 160,
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.18)",
    background: "white",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 700,
    color: THEME_COLOR,
  },
  roleBtnActive: {
    background: THEME_COLOR,
    color: "white",
    border: `1px solid ${THEME_COLOR}`,
  },
  card: {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 18,
    background: "white",
  },
  sectionTitle: {
    margin: "18px 0 10px",
    fontSize: 18,
    fontWeight: 800,
    color: THEME_COLOR,
  },
  grid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "1fr",
    marginBottom: 8,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: THEME_COLOR,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.18)",
    outline: "none",
    fontSize: 14,
    height: 44,
  },
  select: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.18)",
    outline: "none",
    fontSize: 14,
    height: 44,
    background: "white",
  },
  textarea: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.18)",
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  },
  inline: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  pillBtn: {
    minWidth: 64,
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid rgba(0,0,0,0.18)`,
    background: "white",
    cursor: "pointer",
    fontWeight: 700,
    color: THEME_COLOR,
  },
  pillBtnActive: {
    background: THEME_COLOR,
    color: "white",
    border: `1px solid ${THEME_COLOR}`,
  },
  fileInput: {
    padding: "8px 0",
  },
  fileHint: {
    fontSize: 13,
    opacity: 0.75,
    marginTop: 2,
  },
  actions: {
    display: "flex",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryBtn: {
    padding: "10px 18px",
    borderRadius: 14,
    border: `1px solid ${THEME_COLOR}`,
    background: THEME_COLOR,
    color: "white",
    cursor: "pointer",
    minWidth: 180,
    fontSize: 16,
    fontWeight: 800,
  },
  inputError: {
    border: "1px solid rgba(200,0,0,0.6)",
  },
  error: {
    color: "rgba(200,0,0,0.9)",
    fontSize: 13,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.7,
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    marginTop: 4,
  },
  checkboxItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.18)",
    background: "white",
  },
  checkbox: {
    width: 16,
    height: 16,
  },
};
