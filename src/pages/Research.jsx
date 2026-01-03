import React from "react";
import { useNavigate, useParams } from "react-router-dom";

// --- Theme Constants ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";
const BG_GRAY = "#f8f9fa";

// --- Mock Data ---
const researchData = {
  id: 1,
  researchName: "שימוש בבינה מלאכותית לזיהוי מוקדם של מחלות לב",
  description: "מחקר זה מתמקד בפיתוח אלגוריתמים מתקדמים של למידת מכונה (Machine Learning) לצורך ניתוח נתוני אקג.",
  researchArea: "קרדיולוגיה, מדעי הנתונים",
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
  status: "מגייס",
  helsinkiApproval: "H-2023-9988",
  dataType: "רטרוספקטיבי",
  contractFileName: "Research_Contract_v2.pdf"
};

export default function Research() {
  const navigate = useNavigate();
  const { id } = useParams();

  const handleEditClick = () => {
    navigate("/create-research");
  };

  return (
    <div style={styles.page} dir="rtl">
      
      {/* Page Header */}
      <div style={styles.header}>
        <div style={styles.title}>{researchData.researchName}</div>
        <div style={styles.titleUnderline}></div>
      </div>

      {/* Main Card with Responsive Class */}
      <div className="main-card" style={styles.card}>
        
        {/* Top Actions Bar (Responsive) */}
        <div className="action-bar" style={styles.actionBar}>
           <div className="status-group" style={{display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap'}}>
              <span style={styles.statusBadge}>{researchData.status}</span>
              <span style={styles.idBadge}>ID: {researchData.helsinkiApproval}</span>
           </div>
           <button onClick={handleEditClick} style={styles.editButton}>
              <EditIcon />
              עריכה
           </button>
        </div>

        {/* Responsive Grid Layout (Main Content vs Sidebar) */}
        <div className="research-layout">
          
          {/* Main Content Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
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
               {/* Details Grid - Single column on mobile, Two on desktop */}
               <div className="details-grid">
                  <DetailItem label="סוג תגמול" value={researchData.compensation} />
                  <DetailItem label="תוצרי מחקר מצופים" value={researchData.output} />
               </div>
            </Section>

             {/* File Download */}
             {researchData.contractFileName && (
              <div className="file-card" style={styles.fileCard}>
                <div style={styles.fileIcon}>📄</div>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{researchData.contractFileName}</div>
                  <div style={styles.fileAction}>לחץ להורדת חוזה</div>
                </div>
                <button style={styles.downloadBtn}>הורדה</button>
              </div>
            )}
          </div>

          {/* Sidebar / Logistics Column */}
          <div style={styles.sidebar}>
             <h3 style={styles.sidebarHeaderTitle}>לוגיסטיקה וצוות</h3>
             
             <SidebarItem label="מיקום" value={researchData.location} />
             <SidebarItem label="תחום" value={researchData.researchArea} />
             <SidebarItem label="אופן עבודה" value={researchData.workMode} />
             <div style={styles.divider}></div>
             <SidebarItem label="מנחים" value={researchData.mentors} />
             <SidebarItem label="תאריך התחלה" value={new Date(researchData.startDate).toLocaleDateString('he-IL')} />
             <SidebarItem label="משך המחקר" value={`${researchData.durationWeeks} שבועות`} />
             <SidebarItem label="שעות שבועיות" value={`${researchData.weeklyHours} שעות`} />
             <SidebarItem label="גודל צוות" value={`${researchData.teamSize} מתלמדים`} />
             <SidebarItem label="סוג נתונים" value={researchData.dataType} />
             
             <div style={{marginTop: 24}}>
                 <button style={styles.primaryBtn}>הגש מועמדות למחקר</button>
             </div>
          </div>

        </div>
      </div>

      {/* --- Responsive Styles Injection --- */}
      <style>{`
        /* Default Layout (Mobile First) */
        .research-layout { 
          display: grid; 
          gap: 32px; 
          grid-template-columns: 1fr; 
        }
        
        /* Reduce padding on mobile to prevent overflow */
        .main-card {
          padding: 20px !important;
        }

        /* Allow header to wrap on very small screens */
        .action-bar {
          flex-wrap: wrap;
          gap: 16px;
        }

        /* Stack detail items on mobile */
        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        /* Desktop Overrides */
        @media (min-width: 768px) {
          .research-layout { 
            grid-template-columns: 2fr 1fr; 
            align-items: start;
          }
          .main-card {
            padding: 32px !important;
          }
          .details-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// --- Sub Components ---

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    {children}
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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: 6}}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// --- Styles ---

const styles = {
  // Page & Layout
  page: { maxWidth: 900, margin: "0 auto", padding: "24px 12px", fontFamily: "Rubik, system-ui, sans-serif", color: THEME_COLOR },
  header: { textAlign: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 8, lineHeight: 1.2 }, // Slightly smaller title for mobile safety
  titleUnderline: { width: 50, height: 4, background: ACCENT_TEAL, margin: "0 auto", borderRadius: 2 },
  
  // Card Container (Base style, overridden by class for responsive padding)
  card: { border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, background: "white", boxShadow: "0 12px 40px rgba(0,0,0,0.03)" },
  
  // Section Headers
  sectionTitle: { fontSize: 17, fontWeight: 700, color: THEME_COLOR, marginBottom: 16, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: 8, lineHeight: "1" },

  // Action Bar
  actionBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #eee" },
  statusBadge: { background: "#e6fffa", color: "#0d9488", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  idBadge: { background: "#f1f5f9", color: "#64748b", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  editButton: { display: "flex", alignItems: "center", padding: "6px 12px", borderRadius: 20, border: `1px solid #ddd`, background: "white", color: "#666", fontSize: 13, cursor: "pointer", transition: "0.2s", whiteSpace: "nowrap" },

  // Text & Content
  text: { lineHeight: 1.6, color: "#444", fontSize: 15, margin: 0 },
  infoBox: { background: BG_GRAY, padding: 16, borderRadius: 12, border: "1px solid #eee" },
  infoTitle: { fontSize: 14, fontWeight: 700, margin: "0 0 8px 0", color: THEME_COLOR },
  divider: { height: 1, background: "#ddd", margin: "16px 0" },
  
  // Tags
  tagsContainer: { display: "flex", flexWrap: "wrap", gap: 8 },
  skillTag: { background: "white", border: "1px solid #ddd", padding: "4px 12px", borderRadius: 20, fontSize: 13, color: "#555" },

  // Sidebar Logistics
  sidebar: { background: "#fdfdfd", padding: 20, borderRadius: 12, border: "1px solid #eee" },
  sidebarHeaderTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16, color: THEME_COLOR },
  sidebarItem: { display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14, gap: 10 },
  sidebarLabel: { color: "#666", flexShrink: 0 },
  sidebarValue: { fontWeight: 600, color: THEME_COLOR, textAlign: "left" },

  // Details Grid Base Style (Columns handled by CSS class)
  label: { fontSize: 13, fontWeight: 600, color: "#4a4a8a", marginBottom: 4 },
  value: { fontSize: 15, color: "#333" },

  // Files
  fileCard: { display: "flex", alignItems: "center", gap: 12, padding: 12, border: `1px dashed ${ACCENT_TEAL}`, borderRadius: 8, background: "#fafffe", marginTop: 10, flexWrap: "wrap" },
  fileIcon: { fontSize: 20 },
  fileInfo: { flex: 1, minWidth: "150px" }, // Ensures text doesn't crush
  fileName: { fontWeight: 600, fontSize: 13, color: THEME_COLOR, wordBreak: "break-all" }, // Prevents long filenames from breaking layout
  fileAction: { fontSize: 11, color: ACCENT_TEAL },
  downloadBtn: { padding: "6px 12px", borderRadius: 6, background: "white", border: "1px solid #bee3f8", color: "#0369a1", fontSize: 12, cursor: "pointer", fontWeight: 600, marginLeft: "auto" },

  // Primary Button
  primaryBtn: { width: "100%", padding: "12px", borderRadius: 30, background: THEME_COLOR, color: "white", cursor: "pointer", fontSize: 15, fontWeight: 700, border: "none", boxShadow: "0 4px 12px rgba(44, 44, 108, 0.2)", transition: "0.2s" },
};