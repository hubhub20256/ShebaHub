import { useNavigate } from "react-router-dom";
import "./card.css";

export default function ApprenticesCard({ apprentice }) {
  const navigate = useNavigate();

  const shouldShowAvailabilityBadge = apprentice?.hasStudentProfile !== false;

  const rawAvailability =
    apprentice?.isAvailableForResearch ??
    apprentice?.researchAvailability ??
    apprentice?.research_availability;

  const normalizedAvailability = (() => {
    if (rawAvailability === true) return true;
    if (rawAvailability === false) return false;
    if (typeof rawAvailability === "string") {
      const v = rawAvailability.trim();
      if (v === "כן") return true;
      if (v === "לא") return false;
    }
    return null;
  })();

  const availabilityText =
    normalizedAvailability === true
      ? "זמינ/ה להצטרפות למחקר"
      : normalizedAvailability === false
        ? "לא זמינ/ה להצטרפות למחקר"
        : "זמינות להצטרפות למחקר לא צוינה";

  const availabilityClass =
    normalizedAvailability === true
      ? "available"
      : normalizedAvailability === false
        ? "not-available"
        : "unknown";

  const handleProfileClick = () => {
    if (apprentice && apprentice.id) {
      navigate(`/user/${apprentice.id}`);
    } else {
      console.error("Missing apprentice ID!");
    }
  };

  return (
    <section className="apprentice-portal-card" dir="rtl">
      <div className="apprentice-portal-header">
        <div className="apprentice-portal-avatar-wrapper">
          {apprentice.profileImage ? (
            <img 
              src={apprentice.profileImage} 
              alt={apprentice.name} 
              className="apprentice-portal-img" 
            />
          ) : (
            <div style={{fontSize: '2.5rem', display: 'grid', placeItems: 'center', height: '100%', background: '#f8fafc', color: '#cbd5e1'}}>👤</div>
          )}
        </div>
      </div>

      <div className="apprentice-portal-body">
        <h2 className="apprentice-portal-name">{apprentice.name}</h2>
        
        {/* מיכל התגים כעת יכיל רק את הזמינות */}
        <div className="apprentice-badges-wrapper">
          {shouldShowAvailabilityBadge ? (
            <span className={`availability-badge ${availabilityClass}`}>
              {availabilityText}
            </span>
          ) : (
            <span className="availability-badge placeholder">placeholder</span>
          )}
        </div>

        <div className="apprentice-portal-details">
          {/* שדה חדש: שלב הכשרה - עכשיו הוא ראשון ומחליף את האליפסה */}
          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">שלב הכשרה:</span>
            <span className="apprentice-detail-value">
              {apprentice.medical_level || "לא צוין"}
            </span>
          </div>

          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">מוסד לימודים:</span>
            <span className="apprentice-detail-value" title={apprentice.Educational_institution}>
              {apprentice.Educational_institution}
            </span>
          </div>

          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">תחילת לימודים:</span>
            <span className="apprentice-detail-value">{apprentice.school_beginner_year}</span>
          </div>

          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">מין:</span>
            <span className="apprentice-detail-value">{apprentice.gender || "לא צוין"}</span>
          </div>

          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">מחלקה:</span>
            <span className="apprentice-detail-value">{apprentice.department || "כללי"}</span>
          </div>
        </div>

        <button className="apprentice-portal-btn" onClick={handleProfileClick}>
          מעבר לפרופיל המלא
        </button>
      </div>
    </section>
  );
}