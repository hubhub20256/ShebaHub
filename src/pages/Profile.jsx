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
  personalAcademicDescription: "מומחית לקרדיולוגיה עם עניין רב במחקר קליני...",
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
  avatarUrl: "",
};

const Profile = () => {
  const [userData, setUserData] = useState(MOCK_MENTOR);
  
  // --- הוספנו מחדש את המשתנים שחסרו ---
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(MOCK_MENTOR);
  const fileInputRef = useRef(null);

  const toggleUser = () => {
    const nextUser = userData.role === "mentor" ? MOCK_APPRENTICE : MOCK_MENTOR;
    setUserData(nextUser);
    setDraft(nextUser); // מעדכן גם את הטיוטה
    setIsEditing(false);
  };

  // --- הוספנו מחדש את הפונקציות לעריכה ---
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
  const shouldShowSpecialty = isMentor || (userData.role === "apprentice" && (userData.yearOfStudy === "ו'" || userData.yearOfStudy === "ז'"));

  return (
    <div dir="rtl" className="profile-page">
      <div className="profile-dev-toggle">
        <button onClick={toggleUser} className="profile-toggle-btn">
          🔄 החלף תצוגה ({isMentor ? "מנחה" : "מתלמד/שנה ו׳"})
        </button>
      </div>

      <div className="profile-header-card">
        <div className="profile-avatar">
          {userData.avatarUrl ? (
            <img src={userData.avatarUrl} alt="פרופיל" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : (
            <>{userData.firstName[0]}{userData.lastName[0]}</>
          )}
        </div>
        <div className="profile-header-info">
          <h1 className="profile-name">{userData.firstName} {userData.lastName}</h1>
          <div className="profile-badges-row">
            <span className="profile-role-badge">{isMentor ? "מנחה" : "מתלמד/ת"}</span>
            <span className="profile-info-badge">{userData.email}</span>
          </div>
        </div>
        {/* עכשיו openEdit קיים ולכן לא יהיה מסך לבן! */}
        <button className="profile-edit-btn" onClick={openEdit}>עריכת פרופיל</button>
      </div>

      <div className="profile-wide-card">
        <h3 className="profile-section-title">פרטים מקצועיים</h3>
        <div className="profile-grid-content">
           <InfoRow label="מוסד לימודים" value={userData.institution} />
           <InfoRow label="תארים" value={userData.degrees?.join(", ") || "-"} />
           <InfoRow label="מקום עבודה" value={userData.workplace} />
        </div>
      </div>

      {/* --- MODAL UI --- */}
      {isEditing && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.sectionTitle}>עריכת פרופיל</h2>
            <div style={styles.modalRow}>
              <div style={styles.modalAvatar}>
                {draft.avatarUrl ? (
                  <img src={draft.avatarUrl} alt="Preview" style={styles.avatarImg} />
                ) : (
                  <>{draft.firstName[0]}{draft.lastName[0]}</>
                )}
              </div>
              <div style={styles.modalButtonsCol}>
                <button style={styles.primaryBtn} onClick={() => fileInputRef.current?.click()}>החלפת תמונה</button>
                <button style={styles.secondaryBtn} onClick={clearAvatar}>הסרת תמונה</button>
                <input type="file" ref={fileInputRef} onChange={onPickAvatar} style={{ display: "none" }} accept="image/*" />
              </div>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={closeEdit}>סגור</button>
              <button style={styles.primaryBtn} onClick={saveEdit}>שמירה</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="profile-info-row">
    <span className="profile-info-label">{label}:</span>
    <span className="profile-info-value">{value}</span>
  </div>
);

// --- STYLES (Keep this at the bottom) ---
const THEME_COLOR = "#2C2C6C";
const ACCENT_TEAL = "#6cd5bf";
const ACCENT_PINK = "#ef67a0";

const styles = {
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modal: { background: "white", padding: "2rem", borderRadius: "1rem", width: "90%", maxWidth: "500px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", position: "relative" },
  sectionTitle: { fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem", color: THEME_COLOR, borderRight: `4px solid ${ACCENT_PINK}`, paddingRight: "10px" },
  modalRow: { display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" },
  modalAvatar: { width: "80px", height: "80px", borderRadius: "50%", background: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  modalButtonsCol: { display: "flex", flexDirection: "column", gap: "10px" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  primaryBtn: { padding: "10px 20px", borderRadius: "20px", background: THEME_COLOR, color: "white", border: "none", cursor: "pointer", fontWeight: "600" },
  secondaryBtn: { padding: "10px 20px", borderRadius: "20px", background: "white", color: "#666", border: "1px solid #ddd", cursor: "pointer", fontWeight: "600" },
};

export default Profile;