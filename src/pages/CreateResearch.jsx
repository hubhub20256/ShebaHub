import React, { useState, useEffect, useRef } from "react";
import "../styles/CreateResearch.css";

const ISRAEL_CITIES = [
  "תל אביב-יפו", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה", "אשדוד", "נתניה", 
  "באר שבע", "בני ברק", "חולון", "רמת גן", "רחובות", "אשקלון", "בת ים", "הרצליה", "כפר סבא", "אחר"
];

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
    <div className="create-research-page" dir="rtl">
      <div className="create-research-header">
        <div className="create-research-title">יצירת מחקר חדש</div>
        <div className="create-research-underline"></div>
      </div>

      <form className="create-research-card" onSubmit={handleSubmit}>
        <div className="cr-section-title">פרטי המחקר</div>
        
        {/* Full Width Section for Name and Description for better mobile/desktop flow */}
        <div className="cr-full-width">
          <InputField label="שם המחקר" name="researchName" value={form.researchName} onChange={handleChange} required={true} />
        </div>
        <div className="cr-full-width">
          <TextAreaField label="תיאור המחקר" name="description" value={form.description} onChange={handleChange} required={true} />
        </div>

        {/* 2-Column Grid */}
        <div className="create-research-grid">
          
          {/* Right Column (RTL) */}
          <div className="cr-column">
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
          <div className="cr-column">
            
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

        <div className="cr-actions">
          <button type="submit" className="cr-primary-btn">שמור מחקר</button>
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

function InputField({ label, name, value, onChange, type = "text", placeholder, min, required = false }) {
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
        required={required}
      />
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, required = false }) {
  return (
    <div className="cr-field">
      <Label text={label} required={required} />
      <textarea 
        name={name} 
        value={value} 
        onChange={onChange} 
        className="cr-textarea"
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
    <div className="cr-field" ref={containerRef}>
      <Label text={label} required={required} />
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="cr-select-trigger"
      >
        <span style={{ color: value ? "inherit" : "#999" }}>
          {value || placeholder}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </div>

      {isOpen && (
        <div className="cr-dropdown-menu">
          {options.map((option) => (
            <div
              key={option}
              onClick={() => handleSelect(option)}
              className={`cr-dropdown-item ${value === option ? "cr-dropdown-item-selected" : ""}`}
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

function FileField({ label, name, file, onChange, required = false }) {
  return (
    <div className="cr-field">
      <Label text={label} required={required} />
      <div className="cr-file-wrapper">
        <input type="file" name={name} id={`file-${name}`} onChange={onChange} className="cr-file-input" required={required} />
        <label htmlFor={`file-${name}`} className="cr-file-label">
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
    <div className="cr-field" ref={containerRef}>
      <Label text={label} required={required} />
      <div className="cr-date-wrapper" onClick={() => setIsOpen(!isOpen)}>
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
              const isSelected = value && parseInt(value.split("-")[2]) === day && 
                                 parseInt(value.split("-")[1]) === (currentMonth.getMonth() + 1) &&
                                 parseInt(value.split("-")[0]) === currentMonth.getFullYear();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`cr-day-btn ${isSelected ? "cr-day-btn-selected" : ""}`}
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