import React, { useState } from "react";

// --- MOCK DATA FOR DISPLAY ---
const MOCK_MENTOR = {
  role: "mentor",
  firstName: "ד״ר רונית",
  lastName: "כהן",
  email: "ronit.cohen@sheba.health.gov.il",
  institution: "אוניברסיטת תל אביב",
  degrees: ["MD", "PhD"],
  specialtyGroup: "מקצועות העל",
  specialty: "קרדיולוגיה",
  academicRank: "מומחה/ית",
  workplace: "מרכז רפואי שיבא",
  hasMentoringExperience: "כן",
  mentoringExperienceDetails: "הנחיית סטודנטים בשנים קליניות במחלקה פנימית.",
  personalAcademicDescription:
    "מומחית לקרדיולוגיה עם עניין רב במחקר קליני ויישום טכנולוגיות חדשות. מאמינה בשילוב של רפואה אישית ומחקר מתקדם.",
  researchInterests: "אי ספיקת לב, AI ברפואה",
  previousResearchDescription:
    "מחקר מקיף בנושא השפעת תרופות ביולוגיות על אי ספיקת לב (פורסם ב-Nature 2023).",
  recommendationRequest:
    "פרופ' ישראל ישראלי, מנהל מערך הלב, israel@sheba.gov.il",
};

const MOCK_APPRENTICE = {
  role: "apprentice",
  firstName: "יובל",
  lastName: "לוי",
  email: "yuval.levi@student.tau.ac.il",
  institution: "הטכניון",
  degrees: ["MSc"],
  apprenticeStage: "סטודנט",
  yearOfStudy: "ו'",
  workplace: "עוזר מחקר במעבדת שינה",
  isShebaEmployee: "לא",
  workType: "ניתוח סטטיסטי",
  compensationPreference: "מלגה",
  weeklyHours: "10",
  startDate: "01/02/2026",
  softwareSkills: "Python, R, SPSS, Excel",
  professionalExperience:
    "עבודה כעוזר מחקר במשך שנתיים, התמחות בניתוח נתונים ב-SPSS.",
  personalAcademicDescription:
    "סטודנט לרפואה בשנה ו' עם רקע חזק במדעי הנתונים. מחפש להשתלב במחקר המשלב ניתוח נתונים גדולים.",
  specialtyGroup: "מקצועות הבסיס",
  specialty: "פנימית",
  recommendationRequest: "ד״ר דני הנדל, מנחה לפרויקט גמר, danny@technion.ac.il",
};

const Profile = () => {
  const [userData, setUserData] = useState(MOCK_MENTOR);

  const toggleUser = () => {
    setUserData(userData.role === "mentor" ? MOCK_APPRENTICE : MOCK_MENTOR);
  };

  const isMentor = userData.role === "mentor";

  // Logic to show Specialty fields
  const showApprenticeSpecialty =
    !isMentor &&
    ((userData.apprenticeStage !== "סטודנט" &&
      userData.apprenticeStage !== "") ||
      (userData.apprenticeStage === "סטודנט" &&
        (userData.yearOfStudy === "ו'" || userData.yearOfStudy === "ז'")));

  const shouldShowSpecialty = isMentor || showApprenticeSpecialty;

  return (
    <div dir="rtl" style={styles.page}>
      {/* Dev Tool */}
      <div style={styles.devToggle}>
        <button onClick={toggleUser} style={styles.toggleBtn}>
          🔄 החלף תצוגה ({isMentor ? "מנחה" : "מתלמד/שנה ו׳"})
        </button>
      </div>

      {/* 1. Header Card (Full Width) */}
      <div style={styles.headerCard}>
        <div style={styles.avatar}>
          {userData.firstName[0]}
          {userData.lastName[0]}
        </div>
        <div style={styles.headerInfo}>
          <h1 style={styles.name}>
            {userData.firstName} {userData.lastName}
          </h1>
          <div style={styles.badgesRow}>
            <span style={styles.roleBadge}>
              {isMentor ? "מנחה" : "מתלמד/ת"}
            </span>
            <span style={styles.infoBadge}>{userData.email}</span>
          </div>
        </div>
        <button style={styles.editBtn}>עריכת פרופיל</button>
      </div>

      {/* 2. Professional Details (Wide Section - BOTH) */}
      <div style={styles.wideCard}>
        <h3 style={styles.sectionTitle}>פרטים מקצועיים</h3>
        <div style={styles.gridContent}>
          <InfoRow label="מוסד לימודים" value={userData.institution} />
          <InfoRow label="תארים" value={userData.degrees?.join(", ") || "-"} />
          <InfoRow label="מקום עבודה" value={userData.workplace} />

          {isMentor ? (
            <>
              <InfoRow label="שלב בהכשרה" value={userData.academicRank} />
              <InfoRow
                label="ניסיון בהנחיה"
                value={userData.hasMentoringExperience}
              />
            </>
          ) : (
            <>
              <InfoRow label="שלב נוכחי" value={userData.apprenticeStage} />
              {userData.apprenticeStage === "סטודנט" && (
                <InfoRow label="שנת לימודים" value={userData.yearOfStudy} />
              )}
              <InfoRow label="עובד שיבא" value={userData.isShebaEmployee} />
            </>
          )}

          {shouldShowSpecialty && (
            <>
              <InfoRow label="קטגוריית התמחות" value={userData.specialtyGroup} />
              <InfoRow label="התמחות" value={userData.specialty} />
            </>
          )}
        </div>
      </div>

      {/* 2.5. Research Preferences & Availability (Wide Section - ONLY INTERN) */}
      {!isMentor && (
        <div style={styles.wideCard}>
          <h3 style={styles.sectionTitle}>העדפות מחקר וזמינות</h3>
          <div style={styles.gridContent}>
            <InfoRow label="סוג עבודה" value={userData.workType} />
            <InfoRow
              label="תגמול מועדף"
              value={userData.compensationPreference}
            />
            <InfoRow label="שעות שבועיות" value={userData.weeklyHours} />
            <InfoRow label="זמינות להתחלה" value={userData.startDate} />
            <InfoRow
              label="כלים ומיומנויות"
              value={userData.softwareSkills}
            />
          </div>
        </div>
      )}

      {/* 3. Bottom Grid for the rest */}
      <div style={styles.bottomGrid}>
        
        {/* Right Column (About, Recs, Files) */}
        <div style={styles.column}>
          <SectionCard title="אודות">
            <p style={styles.bioText}>{userData.personalAcademicDescription}</p>
          </SectionCard>

          {userData.recommendationRequest && (
            <SectionCard title="ממליצים / חוות דעת">
              <p style={styles.bioText}>{userData.recommendationRequest}</p>
            </SectionCard>
          )}
          
          <SectionCard title="קבצים ומסמכים">
            <div style={styles.filePlaceholder}>
              📄 קורות חיים.pdf
              <span style={styles.downloadLink}>הורדה</span>
            </div>
          </SectionCard>
        </div>

        {/* Left Column (Mentor Specifics & Research OR Intern Professional Exp) */}
        <div style={styles.column}>
          
          {/* MENTOR: Research Interests (Still here as a small card) */}
          {isMentor && (
            <SectionCard title="תחומי עניין ומחקר">
               <InfoRow
                  label="תחומי עניין"
                  value={userData.researchInterests}
               />
            </SectionCard>
          )}

          {/* MENTOR: Previous Research */}
          {isMentor && userData.previousResearchDescription && (
            <SectionCard title="מחקרים קודמים">
              <p style={styles.bioText}>
                {userData.previousResearchDescription}
              </p>
            </SectionCard>
          )}

           {/* MENTOR: Mentoring Detail */}
           {isMentor && userData.mentoringExperienceDetails && (
             <SectionCard title="פירוט ניסיון בהנחיה">
               <p style={styles.bioText}>{userData.mentoringExperienceDetails}</p>
             </SectionCard>
          )}

          {/* INTERN: Professional Exp (Remains here in the grid) */}
          {!isMentor && userData.professionalExperience && (
            <SectionCard title="ניסיון מקצועי קודם">
              <p style={styles.bioText}>{userData.professionalExperience}</p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const SectionCard = ({ title, children }) => (
  <div style={styles.card}>
    <h3 style={styles.sectionTitle}>{title}</h3>
    <div style={styles.cardContent}>{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div style={styles.infoRow}>
    <span style={styles.infoLabel}>{label}:</span>
    <span style={styles.infoValue}>{value}</span>
  </div>
);

// --- STYLES ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";

const styles = {
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 16px",
    fontFamily: "Rubik, system-ui, sans-serif",
    color: THEME_COLOR,
  },
  devToggle: { textAlign: "center", marginBottom: 20 },
  toggleBtn: {
    background: "#eee",
    border: "none",
    padding: "8px 16px",
    borderRadius: 20,
    cursor: "pointer",
    fontSize: 12,
  },

  // 1. HEADER
  headerCard: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    background: "white",
    padding: 32,
    borderRadius: 16,
    boxShadow: "0 12px 40px rgba(0,0,0,0.03)",
    marginBottom: 24,
    border: "1px solid rgba(0,0,0,0.06)",
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${ACCENT_TEAL}, ${THEME_COLOR})`,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  headerInfo: { flex: 1 },
  name: { margin: "0 0 8px 0", fontSize: 28, fontWeight: 800 },
  badgesRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  roleBadge: {
    background: ACCENT_PINK,
    color: "white",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  infoBadge: {
    background: "#f0f0f5",
    color: "#666",
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  editBtn: {
    position: "absolute",
    top: 32,
    left: 32,
    background: "white",
    border: `1px solid ${ACCENT_TEAL}`,
    color: ACCENT_TEAL,
    padding: "8px 20px",
    borderRadius: 20,
    fontWeight: 600,
    cursor: "pointer",
    transition: "0.2s",
  },

  // 2. WIDE CARD (Professional Details & Intern Preferences)
  wideCard: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
    marginBottom: 24,
  },
  gridContent: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
    columnGap: 40, 
    rowGap: 0,
  },

  // 3. BOTTOM GRID
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: 24,
    alignItems: "start",
  },
  column: { display: "flex", flexDirection: "column", gap: 24 },

  // GENERIC CARD STYLES
  card: {
    background: "white",
    borderRadius: 16,
    padding: 24,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 16,
    borderRight: `4px solid ${ACCENT_TEAL}`,
    paddingRight: 10,
    lineHeight: 1,
    color: THEME_COLOR,
  },
  cardContent: { 
    display: "flex", 
    flexDirection: "column", 
    gap: 0 
  },
  
  // ROWS
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #f5f5f5",
    padding: "10px 0",
    minHeight: 32,
  },
  infoLabel: { fontWeight: 600, color: "#000", fontSize: 14 },
  infoValue: { fontWeight: 500, color: "#666", fontSize: 14, textAlign: "left" },
  
  // TEXT
  bioText: {
    lineHeight: "1.6",
    fontSize: 14,
    color: "#555",
    whiteSpace: "pre-line",
  },
  
  // FILES
  filePlaceholder: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f9f9fc",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  downloadLink: {
    color: ACCENT_TEAL,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  },
};

export default Profile;