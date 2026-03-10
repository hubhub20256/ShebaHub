import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/CreateResearch.css";
import { profilesAPI, researchAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import { scrollToFirstError, validateFile } from "../utils/formValidation";
import { HOSPITAL_GROUPS, ALL_HOSPITALS } from "../data/hospitals";

export default function CreateResearch() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  usePageTitle(isEditMode ? "עריכת מחקר" : "יצירת מחקר");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    researchName: "",
    description: "",
    researchArea: "",
    mentors: "",
    teamSize: "",
    startDate: "",
    estimatedCompletionDate: "",
    weeklyHours: "",
    durationMonths: "",
    compensation: [],
    workMode: "",
    requirements: "",
    skillsAndTools: "",
    output: "",
    location: "",
    status: "",
    helsinkiApproval: "",
    dataType: "",
    contract: null
  });

  const [existingContractName, setExistingContractName] = useState(null);
  const [existingContractUrl, setExistingContractUrl] = useState(null);
  const [removeContract, setRemoveContract] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [isMentor, setIsMentor] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const updateField = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const error = validateFile(file, { type: 'document' });
      if (error) {
        setErrors(prev => ({ ...prev, contract: error }));
        toast.error(`שגיאת קובץ: ${error}`);
        e.target.value = '';
        return;
      }
      setErrors(prev => { const next = { ...prev }; delete next.contract; return next; });
      setRemoveContract(false);
    }
    setForm(prev => ({ ...prev, contract: file }));
  };

  useEffect(() => {
    let cancelled = false;

    const checkMentor = async () => {
      try {
        const profile = await profilesAPI.getMyMentorProfile();
        if (!cancelled) {
          setIsMentor(true);
          // Auto-add owner as default mentor on create (not edit)
          if (!isEditMode && profile?.name) {
            setForm(prev => prev.mentors ? prev : { ...prev, mentors: profile.name });
          }
        }
      } catch {
        if (!cancelled) {
          setIsMentor(false);
          setSubmitError("רק מנחים יכולים ליצור/לערוך מחקר");
        }
      }
    };

    checkMentor();
    return () => {
      cancelled = true;
    };
  }, [isEditMode]);

  useEffect(() => {
    let cancelled = false;

    const loadExisting = async () => {
      if (!isEditMode) return;
      if (!isMentor) return;

      setIsLoadingExisting(true);
      setSubmitError(null);
      try {
        const data = await researchAPI.getMyResearch(id);
        if (cancelled) return;

        setForm({
          researchName: data?.researchName || "",
          description: data?.description || "",
          researchArea: data?.researchArea || "",
          mentors: data?.mentors || "",
          teamSize: data?.teamSize != null ? String(data.teamSize) : "",
          startDate: data?.startDate || "",
          estimatedCompletionDate: data?.estimatedCompletionDate || "",
          weeklyHours: data?.weeklyHours != null ? String(data.weeklyHours) : "",
          durationMonths: data?.durationMonths != null ? String(data.durationMonths) : "",
          compensation: Array.isArray(data?.compensation) ? data.compensation : [],
          workMode: data?.workMode || "",
          requirements: data?.requirements || "",
          skillsAndTools: data?.skillsAndTools || "",
          output: data?.output || "",
          location: data?.location || "",
          status: data?.status || "",
          helsinkiApproval: data?.helsinkiApproval || "",
          dataType: data?.dataType || "",
          contract: null,
        });

        setExistingContractName(data?.contractFileName || null);
        setExistingContractUrl(data?.contractUrl || null);
        setRemoveContract(false);
      } catch (err) {
        if (cancelled) return;
        setSubmitError(err?.data?.detail || "שגיאה בטעינת המחקר לעריכה");
      } finally {
        if (!cancelled) setIsLoadingExisting(false);
      }
    };

    loadExisting();
    return () => {
      cancelled = true;
    };
  }, [id, isEditMode, isMentor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isMentor) return;
    setSubmitError(null);
    setIsSaving(true);

    // Client-side validation
    const newErrors = {};
    if (!form.researchName) newErrors.researchName = "שדה חובה";
    if (!form.description) newErrors.description = "שדה חובה";
    if (!form.researchArea) newErrors.researchArea = "שדה חובה";
    if (!form.mentors) newErrors.mentors = "שדה חובה";
    if (!form.teamSize) newErrors.teamSize = "שדה חובה";
    if (!form.startDate) newErrors.startDate = "שדה חובה";
    if (!form.weeklyHours) newErrors.weeklyHours = "שדה חובה";
    if (!form.durationMonths) newErrors.durationMonths = "שדה חובה";
    if (!form.compensation || form.compensation.length === 0) newErrors.compensation = "שדה חובה";
    if (!form.workMode) newErrors.workMode = "שדה חובה";
    if (!form.location) newErrors.location = "שדה חובה";
    if (!form.status) newErrors.status = "שדה חובה";

    // Bounds validation
    if (form.weeklyHours && (Number(form.weeklyHours) < 1 || Number(form.weeklyHours) > 168)) {
      newErrors.weeklyHours = "שעות שבועיות חייבות להיות בין 1 ל-168";
    }
    if (form.durationMonths && (Number(form.durationMonths) < 1 || Number(form.durationMonths) > 120)) {
      newErrors.durationMonths = "משך מחקר חייב להיות בין 1 ל-120 חודשים";
    }
    if (form.teamSize && (Number(form.teamSize) < 1 || Number(form.teamSize) > 500)) {
      newErrors.teamSize = "גודל צוות חייב להיות בין 1 ל-500";
    }
    const today = new Date().toISOString().split('T')[0];
    if (form.estimatedCompletionDate && form.estimatedCompletionDate < today) {
      newErrors.estimatedCompletionDate = "לא ניתן לבחור תאריך שעבר";
    }
    if (form.startDate && form.estimatedCompletionDate && form.estimatedCompletionDate <= form.startDate) {
      newErrors.estimatedCompletionDate = "תאריך סיום חייב להיות אחרי תאריך התחלה";
    }

    if (Object.keys(newErrors).length > 0) {
      setSubmitError("יש שגיאות בטופס, נא לתקן את השדות המסומנים באדום");
      setErrors(newErrors);
      setTimeout(() => scrollToFirstError(newErrors), 100);
      setIsSaving(false);
      return;
    }
    setErrors({});

    try {
      if (isEditMode) {
        await researchAPI.updateMyResearch(id, form, { removeContract });
        toast.success("המחקר עודכן בהצלחה");
        navigate(`/research/${id}`);
      } else {
        await researchAPI.createMyResearch(form);
        toast.success("המחקר נשמר בהצלחה");
        navigate("/researches");
      }
    } catch (err) {
      const errMsg = err?.data?.message || err?.data?.detail || "";
      const isEmailNotVerified =
        err?.status === 403 &&
        typeof errMsg === "string" &&
        errMsg.toLowerCase().includes("verify your email");
      const message = isEmailNotVerified
        ? "יש לאמת את כתובת האימייל לפני יצירת מחקר. בדוק/י את תיבת הדואר הנכנס."
        : errMsg ||
          (typeof err?.data === "object" ? "שגיאה בשמירת המחקר" : null) ||
          "שגיאה בשמירת המחקר";
      setSubmitError(message);
      if (typeof err?.data === "object" && err.data) {
        const serverErrors = {};
        for (const [key, val] of Object.entries(err.data.details || err.data)) {
          if (Array.isArray(val)) serverErrors[key] = val[0];
          else if (typeof val === 'string' && key !== 'detail' && key !== 'code' && key !== 'message') serverErrors[key] = val;
        }
        if (Object.keys(serverErrors).length > 0) {
          setErrors(serverErrors);
          setTimeout(() => scrollToFirstError(serverErrors), 100);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create-research-page" dir="rtl">
      <div className="create-research-header">
        <div className="create-research-title">{isEditMode ? "עריכת מחקר" : "יצירת מחקר חדש"}</div>
        <div className="create-research-underline"></div>
      </div>

      <form className="create-research-card" onSubmit={handleSubmit}>
        {isEditMode && isLoadingExisting && (
          <div style={{ marginBottom: 12, fontWeight: 700 }}>טוען נתונים לעריכה...</div>
        )}
        {submitError && (
          <div style={{ marginBottom: 12, color: "#b91c1c", fontWeight: 600 }}>
            {submitError}
          </div>
        )}
        <div className="cr-section-title">פרטי המחקר</div>
        
        {/* Full Width Section for Name and Description for better mobile/desktop flow */}
        <div className="cr-full-width">
          <InputField label="שם המחקר" name="researchName" value={form.researchName} onChange={handleChange} required={true} error={errors.researchName} />
        </div>
        <div className="cr-full-width">
          <TextAreaField 
            label="תיאור המחקר" 
            name="description" 
            placeholder="ספרי על המחקר, המטרות והחשיבות שלו..."
            value={form.description} 
            onChange={handleChange} 
            required={true} 
            error={errors.description} 
          />
        </div>

        {/* 2-Column Grid */}
        <div className="create-research-grid">
          
          {/* Right Column (RTL) */}
          <div className="cr-column">
            <InputField
              label="תחומי המחקר"
              name="researchArea"
              value={form.researchArea}
              onChange={handleChange}
              placeholder={`לדוגמה: בינה מלאכותית, למידת מכונה, קרדיולוגיה`}
              required={true}
              error={errors.researchArea}
            />
            <MentorSearchField
              label="מנחים"
              name="mentors"
              value={form.mentors}
              onChange={(val) => updateField("mentors", val)}
              required={true}
              error={errors.mentors}
            />
            
            <InputField
              label="גודל צוות, לא כולל מנחים"
              name="teamSize"
              value={form.teamSize}
              onChange={handleChange}
              type="number"
              min="1"
              placeholder="סה״כ חברי צוות"
              required={true}
              error={errors.teamSize}
            />
            <DatePickerField
              label="תאריך תחילת המחקר"
              name="startDate"
              value={form.startDate}
              onChange={(val) => updateField("startDate", val)}
              required={true}
              error={errors.startDate}
            />
            <DatePickerField
              label="תאריך סיום משוער"
              name="estimatedCompletionDate"
              value={form.estimatedCompletionDate}
              onChange={(val) => updateField("estimatedCompletionDate", val)}
              required={false}
              minDate={form.startDate || new Date().toISOString().split('T')[0]}
              error={errors.estimatedCompletionDate}
            />

            <InputField
              label="היקף שעות זמינות שבועי"
              name="weeklyHours"
              value={form.weeklyHours}
              onChange={handleChange}
              type="number"
              min="1"
              required={true}
              error={errors.weeklyHours}
            />

            <InputField
              label="משך המחקר (בחודשים)"
              name="durationMonths"
              value={form.durationMonths}
              onChange={handleChange}
              type="number"
              min="1"
              required={true}
              error={errors.durationMonths}
            />

            <div className="cr-field" id="field-compensation">
              <label className="cr-label">סוגי תגמול <span className="cr-required-star">*</span></label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {["מלגה", "שכר", "קרדיט אקדמי", "ללא תגמול / התנדבות", "גמיש"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setForm((prev) => {
                        const types = [...(prev.compensation || [])];
                        if (types.includes(opt)) return { ...prev, compensation: types.filter(t => t !== opt) };
                        return { ...prev, compensation: [...types, opt] };
                      });
                    }}
                    className={`cr-toggle-btn ${(form.compensation || []).includes(opt) ? "cr-toggle-btn-active" : ""}`}
                    style={{ fontSize: 12, padding: "5px 10px" }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {errors.compensation && <span className="cr-error">{errors.compensation}</span>}
            </div>
             
             <HospitalSelectField
              label="מיקום"
              name="location"
              value={form.location}
              onChange={(val) => updateField("location", val)}
              required={true}
              error={errors.location}
            />
          </div>

          {/* Left Column (RTL) */}
          <div className="cr-column">
            
            <CustomSelectField
              label="אופן העבודה"
              name="workMode"
              value={form.workMode}
              onChange={(val) => updateField("workMode", val)}
              options={["פרונטלי", "היברידי", "מרחוק"]}
              placeholder="בחרי אופן עבודה"
              required={true}
              error={errors.workMode}
            />

            <CustomSelectField
              label="סטטוס המחקר"
              name="status"
              value={form.status}
              onChange={(val) => updateField("status", val)}
              options={[
                { value: "open", label: "פעיל" },
                { value: "in_progress", label: "מגייס" },
                { value: "completed", label: "הסתיים" },
                { value: "closed", label: "בהקפאה" },
                { value: "draft", label: "טיוטה" },
              ]}
              placeholder="בחרי סטטוס"
              required={true}
              error={errors.status}
            />
            
            <InputField label="אישור הלסינקי" name="helsinkiApproval" value={form.helsinkiApproval} onChange={handleChange} placeholder="מספר אישור / סטטוס" required={false} />

             <ToggleField 
              label="נתונים" 
              value={form.dataType} 
              onChange={(val) => updateField("dataType", val)}
              options={["רטרוספקטיבי", "פרוספקטיבי"]}
              required={false}
            />
            
            {/* Optional Fields (TextAreas) */}
            <TextAreaField label="דרישות" 
              name="requirements" 
              placeholder="לדוגמה: סטודנט שנה ג', ניסיון בפייתון..."
              value={form.requirements} 
              onChange={handleChange} 
              required={false} 
              />
            <TextAreaField label="מיומנויות וכלים" 
              name="skillsAndTools" 
              placeholder="לדוגמה: Python, SQL, ניתוח נתונים..."
              value={form.skillsAndTools} 
              onChange={handleChange} 
              required={false} />
            <TextAreaField label="תוצרי המחקר מצופים" 
              name="output" 
              placeholder="לדוגמה: מאמר ב-JAMA"
              value={form.output} 
              onChange={handleChange} 
              required={false} />
            
            {isEditMode && (existingContractName || existingContractUrl) && (
              <div style={{ marginTop: 10, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>חוזה נוכחי</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ opacity: 0.9 }}>
                    {existingContractName || "קובץ קיים"}
                  </div>
                  {existingContractUrl && (
                    <a href={existingContractUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                      הורדה
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setRemoveContract((v) => !v)}
                    style={{
                      border: "1px solid var(--border-color, rgba(0,0,0,0.12))",
                      background: removeContract ? "#111827" : "var(--card-bg, white)",
                      color: removeContract ? "white" : "var(--text-color, #111827)",
                      padding: "6px 10px",
                      borderRadius: 10,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {removeContract ? "ביטול הסרה" : "הסר חוזה"}
                  </button>
                </div>
                {removeContract && (
                  <div style={{ marginTop: 6, color: "#b91c1c", fontWeight: 700 }}>
                    החוזה יימחק בשמירה
                  </div>
                )}
              </div>
            )}

            <FileField
              label={isEditMode ? "החלפת חוזה (אופציונלי)" : "חוזה"}
              name="contract"
              file={form.contract}
              onChange={handleFileChange}
              required={false}
              error={errors.contract}
            />
          </div>

        </div>

        <div className="cr-actions">
          <button type="submit" className="cr-primary-btn" disabled={isSaving || !isMentor}>
            {isSaving ? "שומר..." : (isEditMode ? "שמור שינויים" : "שמור מחקר")}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Helper Components ---

function Label({ text, required }) {
  return (
    <label className="cr-label">
      {text}
      {required && <span className="cr-required-star">*</span>}
    </label>
  );
}

function InputField({ label, name, value, onChange, type = "text", placeholder, min, required = false, error }) {
  return (
    <div className="cr-field">
      <Label text={label} required={required} />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        className="cr-input"
        style={error ? { borderColor: '#b91c1c' } : undefined}
        required={required}
      />
      {error && <span style={{ color: '#b91c1c', fontSize: '0.75rem' }}>{error}</span>}
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, placeholder, required = false, error }) {
  return (
    <div className="cr-field">
      <Label text={label} required={required} />
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="cr-textarea"
        style={error ? { borderColor: '#b91c1c' } : undefined}
        required={required}
      />
      {error && <span style={{ color: '#b91c1c', fontSize: '0.75rem' }}>{error}</span>}
    </div>
  );
}

function CustomSelectField({ label, name, value, onChange, options, placeholder, required = false, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Support both plain strings and {value, label} objects
  const getOptionValue = (opt) => typeof opt === 'object' ? opt.value : opt;
  const getOptionLabel = (opt) => typeof opt === 'object' ? opt.label : opt;
  const displayLabel = options.find(opt => getOptionValue(opt) === value);

  const handleSelect = (option) => {
    onChange(getOptionValue(option));
    setIsOpen(false);
  };

  return (
    <div className="cr-field" ref={containerRef} id={name ? `field-${name}` : undefined}>
      <Label text={label} required={required} />
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cr-select-trigger"
        style={error ? { borderColor: '#b91c1c' } : undefined}
      >
        <span style={{ color: value ? "inherit" : "#999" }}>
          {displayLabel ? getOptionLabel(displayLabel) : placeholder}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>

      {isOpen && (
        <div className="cr-dropdown-menu">
          {options.map((option) => (
            <div
              key={getOptionValue(option)}
              onClick={() => handleSelect(option)}
              className={`cr-dropdown-item ${value === getOptionValue(option) ? "cr-dropdown-item-selected" : ""}`}
            >
              {getOptionLabel(option)}
            </div>
          ))}
        </div>
      )}
      {error && <span style={{ color: '#b91c1c', fontSize: '0.75rem' }}>{error}</span>}
    </div>
  );
}

function HospitalSelectField({ label, name, value, onChange, required = false, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isOther, setIsOther] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const containerRef = useRef(null);

  // Detect custom (non-hospital) value on mount / when value changes externally (edit mode)
  useEffect(() => {
    if (value && value !== "אחר" && !ALL_HOSPITALS.includes(value)) {
      setIsOther(true);
      setCustomValue(value);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredGroups = HOSPITAL_GROUPS.map((group) => {
    if (!search.trim()) return group;
    const filtered = group.hospitals.filter((h) =>
      h.toLowerCase().includes(search.trim().toLowerCase())
    );
    return filtered.length > 0 ? { ...group, hospitals: filtered } : null;
  }).filter(Boolean);

  const handleSelect = (hospital) => {
    if (hospital === "אחר") {
      setIsOther(true);
      setCustomValue("");
      onChange("");
      setIsOpen(false);
      setSearch("");
      return;
    }
    onChange(hospital);
    setIsOpen(false);
    setSearch("");
  };

  const handleBackToList = () => {
    setIsOther(false);
    setCustomValue("");
    onChange("");
  };

  if (isOther) {
    return (
      <div className="cr-field" style={{ position: "relative" }} id={name ? `field-${name}` : undefined}>
        <Label text={label} required={required} />
        <input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="הזיני מיקום..."
          className="cr-select-trigger"
          style={{
            ...(error ? { borderColor: '#b91c1c' } : {}),
            fontSize: 13,
            direction: "rtl",
            cursor: "text",
          }}
        />
        <button
          type="button"
          onClick={handleBackToList}
          style={{
            background: "none",
            border: "none",
            color: "var(--cr-accent-teal, #00897b)",
            fontSize: 12,
            cursor: "pointer",
            padding: "4px 0",
            textDecoration: "underline",
          }}
        >
          חזרה לרשימה
        </button>
        {error && <span style={{ color: '#b91c1c', fontSize: '0.75rem' }}>{error}</span>}
      </div>
    );
  }

  return (
    <div className="cr-field" ref={containerRef} style={{ position: "relative" }} id={name ? `field-${name}` : undefined}>
      <Label text={label} required={required} />
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cr-select-trigger"
        style={error ? { borderColor: '#b91c1c' } : undefined}
      >
        <span style={{ color: value ? "inherit" : "#999", fontSize: value ? 12 : 14 }}>
          {value || "בחרי בית חולים"}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>

      {isOpen && (
        <div className="cr-dropdown-menu" style={{ maxHeight: 300, overflowY: "auto" }}>
          <div style={{ position: "sticky", top: 0, background: "var(--card-bg, #fff)", padding: "6px 8px", borderBottom: "1px solid var(--border-color, #eee)", zIndex: 1 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש בית חולים..."
              autoFocus
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid var(--border-color, #ddd)",
                borderRadius: 6,
                fontSize: 13,
                outline: "none",
                direction: "rtl",
                background: "var(--card-bg, #fff)",
                color: "var(--text-color, #333)",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredGroups.length === 0 && (
            <div style={{ padding: "10px 12px", color: "var(--text-color, #999)", fontSize: 13, textAlign: "center" }}>
              לא נמצאו תוצאות
            </div>
          )}
          {filteredGroups.map((group) => (
            <div key={group.region}>
              <div style={{
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--cr-accent-teal, #00897b)",
                background: "var(--card-bg, #f5f5f5)",
                position: "sticky",
                top: 42,
                zIndex: 1,
              }}>
                {group.region}
              </div>
              {group.hospitals.map((hospital) => (
                <div
                  key={hospital}
                  onClick={() => handleSelect(hospital)}
                  className={`cr-dropdown-item ${value === hospital ? "cr-dropdown-item-selected" : ""}`}
                  style={{ fontSize: 12, paddingRight: 20 }}
                >
                  {hospital}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {error && <span style={{ color: '#b91c1c', fontSize: '0.75rem' }}>{error}</span>}
    </div>
  );
}

function MentorSearchField({ label, name, value, onChange, required = false, error }) {
  const [mentors, setMentors] = useState([]);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    profilesAPI.listMentors().then((data) => {
      if (Array.isArray(data)) setMentors(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Parse current value into array of names
  const selectedNames = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const filtered = mentors.filter((m) => {
    if (!search.trim()) return false;
    const name = m.name || "";
    return name.includes(search.trim()) && !selectedNames.includes(name);
  });

  const addMentor = (name) => {
    const updated = [...selectedNames, name];
    onChange(updated.join(", "));
    setSearch("");
    setShowSuggestions(false);
  };

  const removeMentor = (name) => {
    const updated = selectedNames.filter((n) => n !== name);
    onChange(updated.join(", "));
  };

  const handleInputChange = (e) => {
    setSearch(e.target.value);
    setShowSuggestions(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      addMentor(search.trim());
    }
  };

  const handleBlur = () => {
    // Small delay so dropdown click can fire first
    setTimeout(() => {
      if (search.trim()) {
        addMentor(search.trim());
      }
      setShowSuggestions(false);
    }, 150);
  };

  return (
    <div className="cr-field" ref={containerRef} style={{ position: "relative" }}>
      <Label text={label} required={required} />
      {selectedNames.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {selectedNames.map((name) => (
            <span
              key={name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "var(--card-bg, #e0f2f1)",
                color: "#6cd5bf",
                border: "1px solid var(--border-color, #b2dfdb)",
                borderRadius: 16,
                padding: "4px 10px",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {name}
              <button
                type="button"
                onClick={() => removeMentor(name)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-color, #00897b)",
                  cursor: "pointer",
                  fontSize: 15,
                  lineHeight: 1,
                  padding: 0,
                  marginRight: 2,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={() => { if (search.trim()) setShowSuggestions(true); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="הקלידו שם מנחה וחפשו מהרשימה, או הקישו Enter להוספה ידנית"
        className="cr-input"
        style={error ? { borderColor: "#b91c1c" } : undefined}
      />
      {showSuggestions && filtered.length > 0 && (
        <div
          className="cr-dropdown-menu"
          style={{ maxHeight: 200, overflowY: "auto", position: "absolute", left: 0, right: 0, zIndex: 10 }}
        >
          {filtered.map((m) => (
            <div
              key={m.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addMentor(m.name)}
              className="cr-dropdown-item"
              style={{ fontSize: 13, padding: "8px 12px", cursor: "pointer" }}
            >
              <span>{m.name}</span>
              {m.institution && (
                <span style={{ opacity: 0.6, fontSize: 11, marginRight: 8 }}>{m.institution}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {error && <span style={{ color: "#b91c1c", fontSize: "0.75rem" }}>{error}</span>}
    </div>
  );
}

function ToggleField({ label, value, onChange, options, required = false }) {
  return (
    <div className="cr-field">
      <Label text={label} required={required} />
      <div className="cr-toggle-container">
        {options.map((option) => {
          const isActive = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`cr-toggle-btn ${isActive ? "cr-toggle-btn-active" : ""}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FileField({ label, name, file, onChange, required = false, error }) {
  return (
    <div className="cr-field">
      <Label text={label} required={required} />
      <div className="cr-file-wrapper">
        <input type="file" name={name} id={`file-${name}`} onChange={onChange} className="cr-file-input" required={required} accept=".pdf" />
        <label htmlFor={`file-${name}`} className="cr-file-label">
          {file ? `קובץ נבחר: ${file.name}` : "לחץ להעלאת קובץ"}
        </label>
      </div>
      {error && <span style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: 4, display: "block" }}>{error}</span>}
    </div>
  );
}

function DatePickerField({ label, value, onChange, required = false, minDate, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDayClick = (day) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && dateStr < minDate) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newDate);
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const dayNames = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  return (
    <div className="cr-field" ref={containerRef}>
      <Label text={label} required={required} />
      <div className="cr-date-wrapper" onClick={() => setIsOpen(!isOpen)} style={error ? { borderColor: '#b91c1c' } : undefined}>
        <svg className="cr-calendar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <input
          type="text"
          readOnly
          value={value ? value.split("-").reverse().join("/") : ""}
          placeholder="בחרי תאריך"
          className="cr-input cr-date-input"
        />
      </div>
      {error && <span style={{ color: '#b91c1c', fontSize: '0.75rem' }}>{error}</span>}

      {isOpen && (
        <div className="cr-calendar-popup">
          <div className="cr-calendar-header">
            <button type="button" onClick={() => changeMonth(1)} className="cr-calendar-nav-btn">&lt;</button>
            <span style={{ fontWeight: "700", color: "var(--cr-theme-color)" }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button type="button" onClick={() => changeMonth(-1)} className="cr-calendar-nav-btn">&gt;</button>
          </div>
          <div className="cr-calendar-grid">
            {dayNames.map(d => <div key={d} className="cr-day-label">{d}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast = minDate && dateStr < minDate;
              const isSelected = value && parseInt(value.split("-")[2]) === day &&
                                 parseInt(value.split("-")[1]) === (currentMonth.getMonth() + 1) &&
                                 parseInt(value.split("-")[0]) === currentMonth.getFullYear();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  disabled={isPast}
                  className={`cr-day-btn ${isSelected ? "cr-day-btn-selected" : ""}`}
                  style={isPast ? { opacity: 0.3, cursor: "not-allowed" } : undefined}
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