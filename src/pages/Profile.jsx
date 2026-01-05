import React, { useRef, useState } from "react";

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
  avatarUrl: "",
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
  avatarUrl: "",
};

const Profile = () => {
  const [userData, setUserData] = useState(MOCK_MENTOR);
  
  // EDIT STATE
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(MOCK_MENTOR);
  const fileInputRef = useRef(null);

  const toggleUser = () => {
    setUserData((prev) => (prev.role === "mentor" ? MOCK_APPRENTICE : MOCK_MENTOR));
    setIsEditing(false);
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

  // --- EDIT FUNCTIONS ---
  const openEdit = () => {
    setDraft(userData);
    setIsEditing(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeEdit = () => {
    setIsEditing(false);
  };

  const saveEdit = () => {
    setUserData(draft);
    setIsEditing(false);
  };

  const removeAvatar = () => {
    setDraft((prev) => ({ ...prev, avatarUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("נא לבחור קובץ תמונה בלבד");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({
        ...prev,
        avatarUrl: String(reader.result),
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div dir="rtl" style={styles.page}>
      {/* Dev Tool */}
      <div style={styles.devToggle}>
        <button onClick={toggleUser} style={styles.toggleBtn}>
          🔄 החלף תצוגה ({isMentor ? "מנחה" : "מתלמד/שנה ו׳"})
        </button>
      </div>

      {/* 1. Header Card */}
      <div style={styles.headerCard}>
        <div style={styles.avatar}>
          {userData.avatarUrl ? (
            <img
              src={userData.avatarUrl}
              alt="תמונת פרופיל"
              style={styles.avatarImg}
            />
          ) : (
            <>
              {userData.firstName[0]}
              {userData.lastName[0]}
            </>
          )}
        </div>

        <div style={styles.headerInfo}>
          <h1 style={styles.name}>
            {userData.firstName} {userData.lastName}
          </h1>
          <div style={styles.badgesRow}>
            <span style={styles.roleBadge}>{isMentor ? "מנחה" : "מתלמד/ת"}</span>
            <span style={styles.infoBadge}>{userData.email}</span>
          </div>
        </div>

        <button style={styles.editBtn} onClick={openEdit}>
          עריכת פרופיל
        </button>
      </div>

      {/* EDIT MODAL (Avatar only) */}
      {isEditing && (
        <div style={styles.modalOverlay} onClick={closeEdit}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.sectionTitle}>עריכת פרופיל</h3>

            <div style={styles.modalRow}>
              <div style={styles.modalAvatar}>
                {draft.avatarUrl ? (
                  <img
                    src={draft.avatarUrl}
                    alt="תצוגה מקדימה"
                    style={styles.avatarImg}
                  />
                ) : (
                  <>
                    {draft.firstName?.[0]}
                    {draft.lastName?.[0]}
                  </>
                )}
              </div>

              <div style={styles.modalButtonsCol}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickAvatar}
                  style={{ display: "none" }}
                />

                {draft.avatarUrl ? (
                  <button style={styles.secondaryBtn} onClick={removeAvatar}>
                    הסר תמונה
                  </button>
                ) : (
                  <button
                    style={styles.primaryBtn}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    העלאת תמונה מהמחשב
                  </button>
                )}
              </div>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={closeEdit}>
                סגור
              </button>
              <button style={styles.primaryBtn} onClick={saveEdit}>
                שמירה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Professional Details */}
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

      {/* 2.5. Research Preferences & Availability (Intern Only) */}
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
            <InfoRow label="כלים ומיומנויות" value={userData.softwareSkills} />
          </div>
        </div>
      )}

      {/* 3. Bottom Grid */}
      <div style={styles.bottomGrid}>
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

        <div style={styles.column}>
          {isMentor && (
            <SectionCard title="תחומי עניין ומחקר">
              <InfoRow label="תחומי עניין" value={userData.researchInterests} />
            </SectionCard>
          )}

          {isMentor && userData.previousResearchDescription && (
            <SectionCard title="מחקרים קודמים">
              <p style={styles.bioText}>{userData.previousResearchDescription}</p>
            </SectionCard>
          )}

          {isMentor && userData.mentoringExperienceDetails && (
            <SectionCard title="פירוט ניסיון בהנחיה">
              <p style={styles.bioText}>{userData.mentoringExperienceDetails}</p>
            </SectionCard>
          )}

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
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
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
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: 24,
    alignItems: "start",
  },
  column: { display: "flex", flexDirection: "column", gap: 24 },
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
  cardContent: { display: "flex", flexDirection: "column", gap: 0 },
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
  bioText: {
    lineHeight: "1.6",
    fontSize: 14,
    color: "#555",
    whiteSpace: "pre-line",
  },
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
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 999,
  },
  modal: {
    width: "min(720px, 100%)",
    background: "white",
    borderRadius: 16,
    padding: 24,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
  },
  modalRow: { display: "flex", gap: 16, alignItems: "center" },
  modalAvatar: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${ACCENT_TEAL}, ${THEME_COLOR})`,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 30,
    fontWeight: 700,
    overflow: "hidden",
    flexShrink: 0,
  },
  modalButtonsCol: { display: "flex", flexDirection: "column", gap: 10 },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  primaryBtn: {
    background: ACCENT_TEAL,
    color: "#053b33",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryBtn: {
    background: "#f0f0f5",
    color: "#333",
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
};

export default Profile;