import React from "react";
import { useNavigate, useParams } from "react-router-dom";

// --- Theme Constants (Matching your design) ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";
const BG_GRAY = "#f8f9fa";

// --- Mock Data (מדמה מחקר שנשלף מהדאטה בייס) ---
const researchData = {
  id: 1,
  researchName: "שימוש בבינה מלאכותית לזיהוי מוקדם של מחלות לב",
  description:"מחקר זה מתמקד בפיתוח אלגוריתמים מתקדמים של למידת מכונה (Machine Learning) לצורך ניתוח נתוני אקג וזיהוי דפוסים חריגים שעשויים להעיד על התפתחות מחלות לב בשלבים מוקדמים. המחקר משלב נתונים קליניים והיסטוריה רפואית.",
  researchArea: "קרדיולוגיה, מדעי הנתונים (Data Science)",
  mentors: "פרופ' דניאל כהן, ד\"ר רונית לוי",
  teamSize: 4,
  startDate: "2023-11-01",
  weeklyHours: 10,
  durationWeeks: 12,
  compensation: "מלגה",
  workMode: "היברידי",
  requirements: "ידע ב-Python, רקע בסיסי בביולוגיה/רפואה, יכולת קריאת מאמרים באנגלית.",
  skillsAndTools: "PyTorch, TensorFlow, Pandas, SQL",
  output: "מאמר אקדמי ופיתוח אב-טיפוס",
  location: "תל אביב-יפו (שיבא תל השומר)",
  status: "מגייס", // פעיל, מגייס, הסתיים, בהקפאה
  helsinkiApproval: "H-2023-9988",
  dataType: "רטרוספקטיבי",
  contractFileName: "Research_Contract_v2.pdf"
};

export default function Research() {
  const navigate = useNavigate();
  const { id } = useParams(); // במידה ותרצי לשלוף לפי ID בעתיד

  // פונקציה למעבר לעמוד העריכה
  const handleEditClick = () => {
    // כאן אנחנו מנווטים לעמוד יצירת המחקר
    // בעתיד תוכלי להעביר גם את ה-ID: navigate(`/create-research?edit=${researchData.id}`)
    navigate("/create-research");
  };

  return (
    <div style={styles.page} dir="rtl">
      
      {/* Header Section */}
      <div style={styles.headerContainer}>
        <div style={styles.headerContent}>
          <div style={styles.topRow}>
            <span style={styles.statusBadge}>{researchData.status}</span>
            <span style={styles.idBadge}>ID: {researchData.helsinkiApproval}</span>
          </div>
          <h1 style={styles.title}>{researchData.researchName}</h1>
          <div style={styles.metaRow}>
            <MetaItem icon="📍" text={researchData.location} />
            <MetaItem icon="🎓" text={researchData.researchArea} />
            <MetaItem icon="💼" text={researchData.workMode} />
          </div>
        </div>
        
        {/* Edit Button */}
        <button onClick={handleEditClick} style={styles.editButton}>
          <EditIcon />
          עריכת פרטי מחקר
        </button>
      </div>

      <div style={styles.mainGrid}>
        
        {/* Right Column: Main Content */}
        <div style={styles.mainContent}>
          <Section title="תיאור המחקר">
            <p style={styles.text}>{researchData.description}</p>
          </Section>

          <Section title="דרישות ומיומנויות">
            <div style={styles.infoBox}>
              <h4 style={styles.infoTitle}>דרישות סף:</h4>
              <p style={styles.text}>{researchData.requirements}</p>
              
              <div style={styles.divider}></div>
              
              <h4 style={styles.infoTitle}>כלים וטכנולוגיות:</h4>
              <div style={styles.tagsContainer}>
                {researchData.skillsAndTools.split(",").map((skill, idx) => (
                  <span key={idx} style={styles.skillTag}>{skill.trim()}</span>
                ))}
              </div>
            </div>
          </Section>

          <Section title="תוצרים ותגמול">
             <div style={styles.detailsGrid}>
                <DetailItem label="סוג תגמול" value={researchData.compensation} />
                <DetailItem label="תוצרי מחקר מצופים" value={researchData.output} />
             </div>
          </Section>

           {/* File Download Section */}
           {researchData.contractFileName && (
            <div style={styles.fileCard}>
              <div style={styles.fileIcon}>📄</div>
              <div style={styles.fileInfo}>
                <div style={styles.fileName}>{researchData.contractFileName}</div>
                <div style={styles.fileAction}>לחץ להורדת חוזה / מסמכים</div>
              </div>
              <button style={styles.downloadBtn}>הורדה</button>
            </div>
          )}
        </div>

        {/* Left Column: Sidebar / Logistics */}
        <div style={styles.sidebar}>
          <div style={styles.card}>
            <h3 style={styles.sidebarTitle}>לוגיסטיקה וצוות</h3>
            
            <SidebarItem label="מנחים" value={researchData.mentors} />
            <SidebarItem label="תאריך התחלה" value={new Date(researchData.startDate).toLocaleDateString('he-IL')} />
            <SidebarItem label="משך המחקר" value={`${researchData.durationWeeks} שבועות`} />
            <SidebarItem label="שעות שבועיות" value={`${researchData.weeklyHours} שעות`} />
            <SidebarItem label="גודל צוות" value={`${researchData.teamSize} מתלמדים`} />
            <SidebarItem label="סוג נתונים" value={researchData.dataType} />
            
            <div style={{marginTop: 20}}>
                <button style={styles.applyButton}>הגש מועמדות למחקר</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Sub Components ---

const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    {children}
  </div>
);

const MetaItem = ({ icon, text }) => (
  <div style={styles.metaItem}>
    <span>{icon}</span>
    <span>{text}</span>
  </div>
);

const DetailItem = ({ label, value }) => (
  <div>
    <div style={styles.label}>{label}</div>
    <div style={styles.value}>{value}</div>
  </div>
);

const SidebarItem = ({ label, value }) => (
  <div style={styles.sidebarItem}>
    <div style={styles.sidebarLabel}>{label}</div>
    <div style={styles.sidebarValue}>{value}</div>
  </div>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: 8}}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// --- Styles ---

const styles = {
  page: { 
    maxWidth: 1100, 
    margin: "0 auto", 
    padding: "40px 20px", 
    fontFamily: "Rubik, sans-serif", 
    color: THEME_COLOR 
  },
  
  // Header
  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 40,
    borderBottom: "1px solid #eee",
    paddingBottom: 24,
    gap: 20,
    flexWrap: "wrap"
  },
  headerContent: { flex: 1 },
  topRow: { display: "flex", gap: 12, marginBottom: 12 },
  statusBadge: { 
    background: "#e6fffa", 
    color: "#0d9488", 
    padding: "4px 12px", 
    borderRadius: 20, 
    fontSize: 13, 
    fontWeight: 700 
  },
  idBadge: { 
    background: "#f1f5f9", 
    color: "#64748b", 
    padding: "4px 12px", 
    borderRadius: 20, 
    fontSize: 13, 
    fontWeight: 600 
  },
  title: { 
    fontSize: 36, 
    fontWeight: 800, 
    margin: "0 0 16px 0", 
    lineHeight: 1.2 
  },
  metaRow: { display: "flex", gap: 24, color: "#555", flexWrap: "wrap" },
  metaItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 15 },

  // Buttons
  editButton: {
    display: "flex",
    alignItems: "center",
    padding: "10px 20px",
    borderRadius: 8,
    border: `1px solid ${THEME_COLOR}`,
    background: "white",
    color: THEME_COLOR,
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s",
    fontSize: 14,
    whiteSpace: "nowrap"
  },
  applyButton: {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    background: THEME_COLOR,
    color: "white",
    border: "none",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(44,44,108,0.2)"
  },
  downloadBtn: {
    padding: "8px 16px",
    borderRadius: 6,
    background: "#f0f9ff",
    color: "#0369a1",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13
  },

  // Layout Grid
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 40,
    alignItems: "start"
  },
  mainContent: { display: "flex", flexDirection: "column", gap: 40 },
  sidebar: { position: "sticky", top: 20 },

  // Content Blocks
  section: { marginBottom: 10 },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: 700, 
    color: THEME_COLOR, 
    marginBottom: 16,
    borderRight: `4px solid ${ACCENT_TEAL}`,
    paddingRight: 10
  },
  text: { lineHeight: 1.6, color: "#444", fontSize: 16, margin: 0 },
  
  infoBox: { background: BG_GRAY, padding: 20, borderRadius: 12 },
  infoTitle: { fontSize: 15, fontWeight: 700, margin: "0 0 8px 0" },
  divider: { height: 1, background: "#ddd", margin: "16px 0" },
  
  tagsContainer: { display: "flex", flexWrap: "wrap", gap: 8 },
  skillTag: { 
    background: "white", 
    border: "1px solid #ddd", 
    padding: "6px 12px", 
    borderRadius: 20, 
    fontSize: 13, 
    color: "#555" 
  },

  detailsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  label: { fontSize: 13, color: "#777", marginBottom: 4, fontWeight: 500 },
  value: { fontSize: 16, fontWeight: 600, color: THEME_COLOR },

  // Sidebar Card
  card: { 
    background: "white", 
    border: "1px solid #eee", 
    borderRadius: 16, 
    padding: 24, 
    boxShadow: "0 8px 24px rgba(0,0,0,0.04)" 
  },
  sidebarTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20, borderBottom: "1px solid #eee", paddingBottom: 12 },
  sidebarItem: { display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 14 },
  sidebarLabel: { color: "#666" },
  sidebarValue: { fontWeight: 600, color: THEME_COLOR, textAlign: "left" },

  // File Card
  fileCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 16,
    border: `1px dashed ${ACCENT_TEAL}`,
    borderRadius: 12,
    background: "#fafffe",
    marginTop: 10
  },
  fileIcon: { fontSize: 24 },
  fileInfo: { flex: 1 },
  fileName: { fontWeight: 600, fontSize: 14, color: THEME_COLOR },
  fileAction: { fontSize: 12, color: ACCENT_TEAL },

  // Mobile responsiveness helper (needs CSS media queries ideally, handled simply here)
  "@media (max-width: 768px)": {
     mainGrid: { gridTemplateColumns: "1fr" },
     headerContainer: { flexDirection: "column" }
  }
};