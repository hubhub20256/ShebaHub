import React, { useState, useRef } from "react";
import "../styles/Profile.css";

// --- MOCK DATA ---
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
  personalAcademicDescription: "מומחית לקרדיולוגיה עם עניין רב במחקר קליני ויישום טכנולוגיות חדשות. מאמינה בשילוב של רפואה אישית ומחקר מתקדם.",
  researchInterests: "אי ספיקת לב, AI ברפואה",
  previousResearchDescription: "מחקר מקיף בנושא השפעת תרופות ביולוגיות על אי ספיקת לב (פורסם ב-Nature 2023).",
  recommendationRequest: "פרופ' ישראל ישראלי, מנהל מערך הלב, israel@sheba.gov.il",
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
  professionalExperience: "עבודה כעוזר מחקר במשך שנתיים, התמחות בניתוח נתונים ב-SPSS.",
  personalAcademicDescription: "סטודנט לרפואה בשנה ו' עם רקע חזק במדעי הנתונים. מחפש להשתלב במחקר המשלב ניתוח נתונים גדולים.",
  specialtyGroup: "מקצועות הבסיס",
  specialty: "פנימית",
  recommendationRequest: "ד״ר דני הנדל, מנחה לפרויקט גמר, danny@technion.ac.il",
  avatarUrl: "",
};

const Profile = () => {
  const [userData, setUserData] = useState(MOCK_MENTOR);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(MOCK_MENTOR);
  const fileInputRef = useRef(null);

  // --- Functions ---
  const toggleUser = () => {
    const nextUser = userData.role === "mentor" ? MOCK_APPRENTICE : MOCK_MENTOR;
    setUserData(nextUser);
    setDraft(nextUser);
    setIsEditing(false);
  };

  const openEdit = () => {
    setDraft(userData);
    setIsEditing(true);
  };

  const closeEdit = () => setIsEditing(false);

  const saveEdit = () => {
    setUserData(draft);
    setIsEditing(false);
  };

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({ ...prev, avatarUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setDraft((prev) => ({ ...prev, avatarUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isMentor = userData.role === "mentor";
  const showApprenticeSpecialty = !isMentor && 
    ((userData.apprenticeStage !== "סטודנט" && userData.apprenticeStage !== "") || 
    (userData.apprenticeStage === "סטודנט" && (userData.yearOfStudy === "ו'" || userData.yearOfStudy === "ז'")));

  const shouldShowSpecialty = isMentor || showApprenticeSpecialty;

  return (
    <div dir="rtl" className="profile-page">
      {/* Dev Toggle */}
      <div className="profile-dev-toggle">
        <button onClick={toggleUser} className="profile-toggle-btn">
          🔄 החלף תצוגה ({isMentor ? "מנחה" : "מתלמד/שנה ו׳"})
        </button>
      </div>

      {/* 1. Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar">
          {userData.avatarUrl ? (
            <img src={userData.avatarUrl} alt="פרופיל" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : (
            <>{userData?.firstName?.[0]}{userData?.lastName?.[0]}</>
          )}
        </div>
        <div className="profile-header-info">
          <h1 className="profile-name">{userData.firstName} {userData.lastName}</h1>
          <div className="profile-badges-row">
            <span className={`profile-role-badge ${isMentor ? "mentor-badge" : "apprentice-badge"}`}>
              {isMentor ? "מנחה" : "מתלמד/ת"}
            </span>
            <span className="profile-info-badge">{userData.email}</span>
          </div>
        </div>
        <button className="profile-edit-btn" onClick={openEdit}>עריכת פרופיל</button>
      </div>

      {/* 2. Professional Details Section */}
      <div className="profile-wide-card">
        <h3 className="profile-section-title">פרטים מקצועיים</h3>
        <div className="profile-grid-content">
          <InfoRow label="מוסד לימודים" value={userData.institution} />
          <InfoRow label="תארים" value={userData.degrees?.join(", ") || "-"} />
          <InfoRow label="מקום עבודה" value={userData.workplace} />

          {isMentor ? (
            <>
              <InfoRow label="שלב בהכשרה" value={userData.academicRank} />
              <InfoRow label="ניסיון בהנחיה" value={userData.hasMentoringExperience} />
            </>
          ) : (
            <>
              <InfoRow label="שלב נוכחי" value={userData.apprenticeStage} />
              {userData.apprenticeStage === "סטודנט" && <InfoRow label="שנת לימודים" value={userData.yearOfStudy} />}
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

      {/* 3. Intern Specific Section */}
      {!isMentor && (
        <div className="profile-wide-card">
          <h3 className="profile-section-title">העדפות מחקר וזמינות</h3>
          <div className="profile-grid-content">
            <InfoRow label="סוג עבודה" value={userData.workType} />
            <InfoRow label="תגמול מועדף" value={userData.compensationPreference} />
            <InfoRow label="שעות שבועיות" value={userData.weeklyHours} />
            <InfoRow label="זמינות להתחלה" value={userData.startDate} />
            <InfoRow label="כלים ומיומנויות" value={userData.softwareSkills} />
          </div>
        </div>
      )}

      {/* 4. Bottom Grid Content */}
      <div className="profile-bottom-grid">
        <div className="profile-column">
          <SectionCard title="אודות">
            <p className="profile-bio-text">{userData.personalAcademicDescription}</p>
          </SectionCard>

          {userData.recommendationRequest && (
            <SectionCard title="ממליצים / חוות דעת">
              <p className="profile-bio-text">{userData.recommendationRequest}</p>
            </SectionCard>
          )}

          <SectionCard title="קבצים ומסמכים">
            <div className="profile-file-placeholder">
              📄 קורות חיים.pdf
              <span className="profile-download-link">הורדה</span>
            </div>
          </SectionCard>
        </div>

        <div className="profile-column">
          {isMentor && (
            <>
              <SectionCard title="תחומי עניין ומחקר">
                <InfoRow label="תחומי עניין" value={userData.researchInterests} />
              </SectionCard>
              {userData.previousResearchDescription && (
                <SectionCard title="מחקרים קודמים">
                  <p className="profile-bio-text">{userData.previousResearchDescription}</p>
                </SectionCard>
              )}
              {userData.mentoringExperienceDetails && (
                <SectionCard title="פירוט ניסיון בהנחיה">
                  <p className="profile-bio-text">{userData.mentoringExperienceDetails}</p>
                </SectionCard>
              )}
            </>
          )}

          {!isMentor && userData.professionalExperience && (
            <SectionCard title="ניסיון מקצועי קודם">
              <p className="profile-bio-text">{userData.professionalExperience}</p>
            </SectionCard>
          )}
        </div>
      </div>

      {/* --- MODAL UI FOR IMAGE EDITING --- */}
      {isEditing && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>עריכת תמונת פרופיל</h2>
            <div style={styles.modalRow}>
              <div style={styles.modalAvatarPreview}>
                {draft.avatarUrl ? (
                  <img src={draft.avatarUrl} alt="Preview" style={styles.avatarImg} />
                ) : (
                  <>{draft?.firstName?.[0]}{draft?.lastName?.[0]}</>
                )}
              </div>
              <div style={styles.modalButtonsCol}>
                <button style={styles.primaryBtn} onClick={() => fileInputRef.current?.click()}>החלפת תמונה</button>
                <button style={styles.secondaryBtn} onClick={clearAvatar}>הסרת תמונה</button>
                <input type="file" ref={fileInputRef} onChange={onPickAvatar} style={{ display: "none" }} accept="image/*" />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={closeEdit}>ביטול</button>
              <button style={styles.primaryBtn} onClick={saveEdit}>שמירת שינויים</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-Components ---
const SectionCard = ({ title, children }) => (
  <div className="profile-card">
    <h3 className="profile-section-title">{title}</h3>
    <div className="profile-card-content">{children}</div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="profile-info-row">
    <span className="profile-info-label">{label}:</span>
    <span className="profile-info-value">{value || "-"}</span>
  </div>
);

// --- Styles for Modal ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_PINK = "#ef67a0";

const styles = {
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "white", padding: "2rem", borderRadius: "1rem", width: "90%", maxWidth: "450px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" },
  modalTitle: { fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.5rem", color: THEME_COLOR, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: "10px" },
  modalRow: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" },
  modalAvatarPreview: { width: "100px", height: "100px", borderRadius: "50%", background: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: "bold", overflow: "hidden", color: THEME_COLOR },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  modalButtonsCol: { display: "flex", flexDirection: "column", gap: "10px" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" },
  primaryBtn: { padding: "10px 20px", borderRadius: "20px", background: THEME_COLOR, color: "white", border: "none", cursor: "pointer", fontWeight: "600" },
  secondaryBtn: { padding: "10px 20px", borderRadius: "20px", background: "white", color: "#666", border: "1px solid #ddd", cursor: "pointer", fontWeight: "600" },
};

export default Profile;