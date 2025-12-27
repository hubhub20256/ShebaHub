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
  sectionTitle: { fontSize: 17, fontWeight: 700, color: THEME_COLOR, marginBottom: 16, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: 8, lineHeight: "1" },
  grid: { display: "grid", gap: "20px", marginBottom: 24 },
  
  // Base Field Styles
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 4, position: "relative" },
  label: { fontSize: 13, fontWeight: 600, color: "#4a4a8a", marginBottom: 2 },
  input: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, outlineColor: ACCENT_TEAL, transition: "border 0.2s", height: 42, boxSizing: "border-box", width: "100%", fontFamily: "inherit", background: "white" },
  select: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "white", outlineColor: ACCENT_TEAL, height: 42, width: "100%", fontFamily: "inherit", cursor: "pointer", appearance: "none" },
  textarea: { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, resize: "vertical", outlineColor: ACCENT_TEAL, fontFamily: "inherit" },
  
  // Custom Components Styles
  fileWrapper: { position: "relative", width: "100%" },
  fileInput: { opacity: 0, position: "absolute", zIndex: -1, width: "0.1px" },
  fileLabel: { display: "block", textAlign: "center", padding: "12px", borderRadius: 8, border: `1px dashed ${ACCENT_TEAL}`, color: ACCENT_TEAL, fontWeight: 600, cursor: "pointer", fontSize: 13, background: "#fafffe", transition: "0.2s" },
  
  // Toggle Button Styles (Matching screenshot)
  toggleContainer: { display: "flex", gap: 12 },
  toggleBtn: { flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #7e7e7e", background: "white", color: "#666", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s" },
  toggleBtnActive: { background: ACCENT_TEAL, color: "white", borderColor: ACCENT_TEAL, border: `1px solid ${ACCENT_TEAL}` },

  // Date Picker Custom Styles
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
        
        <div className="research-grid" style={styles.grid}>
          
          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <InputField label="שם המחקר" name="researchName" value={form.researchName} onChange={handleChange} />
            <TextAreaField label="תיאור המחקר" name="description" value={form.description} onChange={handleChange} />
            <InputField label="תחומי המחקר" name="researchArea" value={form.researchArea} onChange={handleChange} />
            <InputField label="מנחים" name="mentors" value={form.mentors} onChange={handleChange} />
            
            <InputField 
              label="גודל הצוות" 
              name="teamSize" 
              value={form.teamSize} 
              onChange={handleChange} 
              type="number" 
              min="1" 
              placeholder="מספר מתלמדים"
            />
            
            <DatePickerField 
              label="תאריך תחילת המחקר" 
              name="startDate" 
              value={form.startDate} 
              onChange={(val) => updateField("startDate", val)} 
            />

            <InputField 
              label="היקף שעות זמינות שבועי" 
              name="weeklyHours" 
              value={form.weeklyHours} 
              onChange={handleChange} 
              type="number" 
              min="1" 
            />

            <InputField 
              label="משך המחקר (בשבועות)" 
              name="durationWeeks" 
              value={form.durationWeeks} 
              onChange={handleChange} 
              type="number" 
              min="1" 
            />

            <SelectField 
              label="תגמול" 
              name="compensation" 
              value={form.compensation} 
              onChange={handleChange}
              options={["מלגה", "שכר", "קרדיט אקדמי", "ללא תגמול / התנדבות"]}
              placeholder="[ בחרי סוג תגמול ]"
            />
          </div>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <SelectField 
              label="אופן העבודה" 
              name="workMode" 
              value={form.workMode} 
              onChange={handleChange}
              options={["פרונטלי", "היברידי", "מרחוק"]}
              placeholder="[ בחרי אופן עבודה ]"
            />

            <InputField label="דרישות" name="requirements" value={form.requirements} onChange={handleChange} />
            <InputField label="מיומנויות וכלים" name="skillsAndTools" value={form.skillsAndTools} onChange={handleChange} />
            <InputField label="תוצרי המחקר" name="output" value={form.output} onChange={handleChange} />
            
            <SelectField 
              label="מיקום" 
              name="location" 
              value={form.location} 
              onChange={handleChange}
              options={ISRAEL_CITIES}
              placeholder="[ בחרי עיר ]"
            />

            <SelectField 
              label="סטטוס המחקר" 
              name="status" 
              value={form.status} 
              onChange={handleChange}
              options={["פעיל", "מגייס", "הסתיים", "בהקפאה"]}
              placeholder="[ בחרי סטטוס ]"
            />

            <InputField label="אישור הלסינקי" name="helsinkiApproval" value={form.helsinkiApproval} onChange={handleChange} placeholder="מספר אישור / סטטוס" />
            
            <ToggleField 
              label="נתונים" 
              value={form.dataType} 
              onChange={(val) => updateField("dataType", val)}
              options={["רטרוספקטיבי", "פרוספקטיבי"]}
            />
            
            <FileField label="חוזה" name="contract" file={form.contract} onChange={handleFileChange} />
          </div>

        </div>

        <div style={styles.actions}>
          <button type="submit" style={styles.primaryBtn}>שמור מחקר</button>
        </div>
      </form>

      {/* Style for responsive grid and custom select arrow */}
      <style>{`
        .research-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) {
          .research-grid { grid-template-columns: 1fr 1fr; }
        }
        select {
           background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%232C2C6C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
           background-repeat: no-repeat;
           background-position: left 12px top 50%;
           background-size: 10px auto;
        }
      `}</style>
    </div>
  );
}

// --- Helper Components ---

function InputField({ label, name, value, onChange, type = "text", placeholder, min }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input 
        type={type} 
        name={name} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        min={min}
        style={styles.input} 
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, placeholder }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <select name={name} value={value} onChange={onChange} style={styles.select}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <textarea name={name} value={value} onChange={onChange} rows={3} style={styles.textarea} />
    </div>
  );
}

function ToggleField({ label, value, onChange, options }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
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

function FileField({ label, name, file, onChange }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <div style={styles.fileWrapper}>
        <input type="file" name={name} id={`file-${name}`} onChange={onChange} style={styles.fileInput} />
        <label htmlFor={`file-${name}`} style={styles.fileLabel}>
          {file ? `קובץ נבחר: ${file.name}` : "לחץ להעלאת קובץ"}
        </label>
      </div>
    </div>
  );
}

// --- Custom Date Picker (Matching Screenshot) ---
function DatePickerField({ label, name, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  // Default to current date if no value, or parse value
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
    // Format YYYY-MM-DD
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newDate);
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 is Sunday

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const dayNames = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

  return (
    <div style={styles.field} ref={containerRef}>
      <label style={styles.label}>{label}</label>
      <div style={styles.dateInputWrapper} onClick={() => setIsOpen(!isOpen)}>
        {/* Calendar Icon SVG */}
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
            {/* Empty cells for start of month */}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {/* Days */}
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