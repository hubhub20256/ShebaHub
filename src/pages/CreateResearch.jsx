import React, { useState, useEffect, useRef } from "react";

const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";

const ISRAEL_CITIES = [
  "תל אביב-יפו", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה", "אשדוד", "נתניה", 
  "באר שבע", "בני ברק", "חולון", "רמת גן", "רחובות", "אשקלון", "בת ים", "הרצליה", "כפר סבא", "אחר"
];

const styles = {
  page: { maxWidth: 900, margin: "0 auto", padding: "40px 16px", fontFamily: "Rubik, system-ui, sans-serif", color: THEME_COLOR },
  header: { textAlign: "center", marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 800, marginBottom: 8 },
  titleUnderline: { width: 50, height: 4, background: ACCENT_TEAL, margin: "0 auto", borderRadius: 2 },
  card: { border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: "32px", background: "white", boxShadow: "0 12px 40px rgba(0,0,0,0.03)" },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: THEME_COLOR, marginBottom: 20, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: 8, lineHeight: "1" },
  
  // Layout Grids
  fullWidth: { marginBottom: 20 },
  grid: { display: "grid", gap: "24px", marginBottom: 24, alignItems: "start" },

  // Fields
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 4, position: "relative" },
  label: { fontSize: 13, fontWeight: 600, color: "#4a4a8a", marginBottom: 2 },
  requiredStar: { color: ACCENT_PINK, marginRight: 4 },
  
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outlineColor: ACCENT_TEAL, transition: "border 0.2s", height: 42, boxSizing: "border-box", width: "100%", fontFamily: "inherit", background: "white" },
  textarea: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, resize: "vertical", outlineColor: ACCENT_TEAL, fontFamily: "inherit", minHeight: "80px" },

  // Custom Components
  customSelectTrigger: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "white", height: 42, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", boxSizing: "border-box" },
  dropdownMenu: { position: "absolute", top: "105%", left: 0, right: 0, maxHeight: "220px", overflowY: "auto", background: "white", borderRadius: 8, border: "1px solid #ddd", boxShadow: "0 4px 15px rgba(0,0,0,0.1)", zIndex: 100 },
  dropdownItem: { padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f5f5", transition: "background 0.1s" },

  fileWrapper: { position: "relative", width: "100%" },
  fileInput: { opacity: 0, position: "absolute", zIndex: -1, width: "0.1px" },
  fileLabel: { display: "block", textAlign: "center", padding: "12px", borderRadius: 8, border: `1px dashed ${ACCENT_TEAL}`, color: ACCENT_TEAL, fontWeight: 600, cursor: "pointer", fontSize: 13, background: "#fafffe", transition: "0.2s" },

  toggleContainer: { display: "flex", gap: 12 },
  toggleBtn: { flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #ddd", background: "white", color: "#666", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s" },
  toggleBtnActive: { background: ACCENT_TEAL, color: "white", borderColor: ACCENT_TEAL, boxShadow: "0 2px 8px rgba(108, 213, 191, 0.4)" },

  // Date Picker
  dateInputWrapper: { position: "relative", width: "100%" },
  calendarIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: ACCENT_TEAL, pointerEvents: "none" },
  calendarPopup: { position: "absolute", top: "110%", left: 0, width: "100%", maxWidth: "300px", background: "white", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", border: "1px solid #eee", padding: 16, zIndex: 100 },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, direction: "rtl" },
  calendarNavBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#666", fontWeight: "bold" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, direction: "rtl", textAlign: "center" },
  dayLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  dayBtn: { width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#333" },
  dayBtnSelected: { background: THEME_COLOR, color: "white", fontWeight: "bold" },

  actions: { display: "flex", justifyContent: "center", marginTop: 32 },
  primaryBtn: { padding: "14px 48px", borderRadius: 30, background: THEME_COLOR, color: "white", cursor: "pointer", fontSize: 16, fontWeight: 700, border: "none", boxShadow: "0 4px 12px rgba(44, 44, 108, 0.2)", transition: "0.2s" },
};

export default function CreateResearch() {
  const [form, setForm] = useState({
    researchName: "",
    description: "",
    researchArea: "",
    mentors: "",
    teamSize: "", 
    startDate: "",
    weeklyHours: "",
    durationWeeks: "",
    compensation: "",
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const updateField = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setForm(prev => ({ ...prev, contract: file }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Research Form Submitted:", form);
    alert("הטופס נשלח בהצלחה");
  };

  return (
    <div style={styles.page} dir="rtl">
      <div style={styles.header}>
        <div style={styles.title}>יצירת מחקר חדש</div>
        <div style={styles.titleUnderline}></div>
      </div>

      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.sectionTitle}>פרטי המחקר</div>
        
        {/* Full Width Section for Name and Description for better mobile/desktop flow */}
        <div style={styles.fullWidth}>
          <InputField label="שם המחקר" name="researchName" value={form.researchName} onChange={handleChange} required={true} />
        </div>
        <div style={styles.fullWidth}>
          <TextAreaField label="תיאור המחקר" name="description" value={form.description} onChange={handleChange} required={true} />
        </div>

        {/* 2-Column Grid */}
        <div className="research-grid" style={styles.grid}>
          
          {/* Right Column (RTL) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InputField label="תחומי המחקר" name="researchArea" value={form.researchArea} onChange={handleChange} required={true} />
            <InputField label="מנחים" name="mentors" value={form.mentors} onChange={handleChange} required={true} />
            
            <InputField 
              label="גודל הצוות" 
              name="teamSize" 
              value={form.teamSize} 
              onChange={handleChange} 
              type="number" 
              min="1" 
              placeholder="מספר מתלמדים"
              required={true}
            />
            
            <DatePickerField 
              label="תאריך תחילת המחקר" 
              name="startDate" 
              value={form.startDate} 
              onChange={(val) => updateField("startDate", val)} 
              required={true}
            />

            <InputField 
              label="היקף שעות זמינות שבועי" 
              name="weeklyHours" 
              value={form.weeklyHours} 
              onChange={handleChange} 
              type="number" 
              min="1" 
              required={true}
            />

            <InputField 
              label="משך המחקר (בשבועות)" 
              name="durationWeeks" 
              value={form.durationWeeks} 
              onChange={handleChange} 
              type="number" 
              min="1" 
              required={true}
            />

            <CustomSelectField 
              label="תגמול" 
              value={form.compensation} 
              onChange={(val) => updateField("compensation", val)}
              options={["מלגה", "שכר", "קרדיט אקדמי", "ללא תגמול / התנדבות"]}
              placeholder="בחרי סוג תגמול"
              required={true}
            />
             
             <CustomSelectField 
              label="מיקום" 
              value={form.location} 
              onChange={(val) => updateField("location", val)}
              options={ISRAEL_CITIES}
              placeholder="בחרי עיר"
              required={true}
            />
          </div>

          {/* Left Column (RTL) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <CustomSelectField 
              label="אופן העבודה" 
              value={form.workMode} 
              onChange={(val) => updateField("workMode", val)}
              options={["פרונטלי", "היברידי", "מרחוק"]}
              placeholder="בחרי אופן עבודה"
              required={true}
            />

            <CustomSelectField 
              label="סטטוס המחקר" 
              value={form.status} 
              onChange={(val) => updateField("status", val)}
              options={["פעיל", "מגייס", "הסתיים", "בהקפאה"]}
              placeholder="בחרי סטטוס"
              required={true}
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
            <TextAreaField label="דרישות" name="requirements" value={form.requirements} onChange={handleChange} required={false} />
            <TextAreaField label="מיומנויות וכלים" name="skillsAndTools" value={form.skillsAndTools} onChange={handleChange} required={false} />
            <TextAreaField label="תוצרי המחקר" name="output" value={form.output} onChange={handleChange} required={false} />
            
            <FileField label="חוזה" name="contract" file={form.contract} onChange={handleFileChange} required={true} />
          </div>

        </div>

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryBtn}>שמור מחקר</button>
        </div>
      </form>

      <style>{`
        .research-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) {
          .research-grid { grid-template-columns: 1fr 1fr; }
        }
        /* Scrollbar styling */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #aaa; }
      `}</style>
    </div>
  );
}

// --- Helper Components ---

function Label({ text, required }) {
  return (
    <label style={styles.label}>
      {text}
      {required && <span style={styles.requiredStar}>*</span>}
    </label>
  );
}

function InputField({ label, name, value, onChange, type = "text", placeholder, min, required = false }) {
  return (
    <div style={styles.field}>
      <Label text={label} required={required} />
      <input 
        type={type} 
        name={name} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        min={min}
        style={styles.input} 
        required={required}
      />
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, required = false }) {
  return (
    <div style={styles.field}>
      <Label text={label} required={required} />
      <textarea 
        name={name} 
        value={value} 
        onChange={onChange} 
        rows={4} 
        style={styles.textarea} 
        required={required}
      />
    </div>
  );
}

function CustomSelectField({ label, value, onChange, options, placeholder, required = false }) {
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

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div style={styles.field} ref={containerRef}>
      <Label text={label} required={required} />
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.customSelectTrigger}
      >
        <span style={{ color: value ? THEME_COLOR : "#999" }}>
          {value || placeholder}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill={THEME_COLOR}>
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>

      {isOpen && (
        <div style={styles.dropdownMenu}>
          {options.map((option) => (
            <div
              key={option}
              onClick={() => handleSelect(option)}
              onMouseEnter={(e) => e.target.style.background = "#f0f7ff"}
              onMouseLeave={(e) => e.target.style.background = "white"}
              style={{
                ...styles.dropdownItem,
                color: value === option ? THEME_COLOR : "#333",
                fontWeight: value === option ? "700" : "400",
                background: value === option ? "#f0f7ff" : "white"
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleField({ label, value, onChange, options, required = false }) {
  return (
    <div style={styles.field}>
      <Label text={label} required={required} />
      <div style={styles.toggleContainer}>
        {options.map((option) => {
          const isActive = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              style={{
                ...styles.toggleBtn,
                ...(isActive ? styles.toggleBtnActive : {})
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FileField({ label, name, file, onChange, required = false }) {
  return (
    <div style={styles.field}>
      <Label text={label} required={required} />
      <div style={styles.fileWrapper}>
        <input type="file" name={name} id={`file-${name}`} onChange={onChange} style={styles.fileInput} required={required} />
        <label htmlFor={`file-${name}`} style={styles.fileLabel}>
          {file ? `קובץ נבחר: ${file.name}` : "לחץ להעלאת קובץ"}
        </label>
      </div>
    </div>
  );
}

function DatePickerField({ label, name, value, onChange, required = false }) {
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
    <div style={styles.field} ref={containerRef}>
      <Label text={label} required={required} />
      <div style={styles.dateInputWrapper} onClick={() => setIsOpen(!isOpen)}>
        <svg style={styles.calendarIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          style={{...styles.input, paddingLeft: "36px", cursor: "pointer"}}
        />
      </div>

      {isOpen && (
        <div style={styles.calendarPopup}>
          <div style={styles.calendarHeader}>
            <button type="button" onClick={() => changeMonth(1)} style={styles.calendarNavBtn}>&lt;</button>
            <span style={{ fontWeight: "700", color: THEME_COLOR }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button type="button" onClick={() => changeMonth(-1)} style={styles.calendarNavBtn}>&gt;</button>
          </div>
          <div style={styles.calendarGrid}>
            {dayNames.map(d => <div key={d} style={styles.dayLabel}>{d}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = value && parseInt(value.split("-")[2]) === day && 
                                 parseInt(value.split("-")[1]) === (currentMonth.getMonth() + 1) &&
                                 parseInt(value.split("-")[0]) === currentMonth.getFullYear();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  style={{...styles.dayBtn, ...(isSelected ? styles.dayBtnSelected : {})}}
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