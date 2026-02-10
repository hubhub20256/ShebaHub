import { useNavigate } from "react-router-dom";
import "./card.css";

export default function ApprenticesCard({ apprentice }) {
  const navigate = useNavigate();

  const isAvailable = apprentice.research_availability === "כן";
  const availabilityText = isAvailable ? "זמינ/ה להצטרפות למחקר" : "לא זמינ/ה להצטרפות למחקר";
  const availabilityClass = isAvailable ? "available" : "not-available";

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
          <span className={`availability-badge ${availabilityClass}`}>
            {availabilityText}
          </span>
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
            <span className="apprentice-detail-label">אימייל:</span>
            <span className="apprentice-detail-value" title={apprentice.email}>
              {apprentice.email}
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