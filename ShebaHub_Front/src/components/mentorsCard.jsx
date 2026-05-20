// import "./card.css";

// export default function MentorsCard({ mentor }) {
//   return (
//     <section className="mentorCard" dir="rtl">

//       <header className="mentorCard__header">
//         <div className="mentorCard__avatar">
//           {mentor.profileImage ? (
//             <img
//               src={mentor.profileImage}
//               alt={`${mentor.name || 'mentor'} avatar`}
//               className="mentorCard__img"
//             />
//           ) : (
//             <span style={{ color: 'white' }}>?</span>
//           )}
//         </div>
//         <h2 className="mentorCard__title">{mentor.name}</h2>
//       </header>

//       <div className="mentorCard__content">
    
//         <div className="mentorCard__boxes">
  
//           {[...Array(5)].map((_, i) => (
//             <div key={i} className="mentorCard__box" />
//           ))}
//         </div>

//         <aside className="mentorCard__side">
    
//           <div className="mentorCard__labels">
//             <div><strong>מין:</strong> {mentor.gender}</div>
//             <div className="card-email-group">
//               <strong>דואר אלקטרוני:</strong>
//               <span>{mentor.email}</span>
//             </div>
//             <div><strong>תחום התמחות:</strong> {mentor.specialty}</div>
//             <div><strong>תארים:</strong> {mentor.degrees}</div>
//             <div><strong>מוסד לימודים:</strong> {mentor.Educational_institution}</div>
//           </div>
//         </aside>
//       </div>
//     </section>
//   );
// }


import { useNavigate } from "react-router-dom";
import "./card.css";

export default function MentorsCard({ mentor }) {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (mentor && mentor.id) {
      navigate(`/user/${mentor.id}`);
    } else {
      console.error("Missing mentor ID!");
    }
  };

  const specialtiesList = mentor.specialties || (mentor.specialty ? mentor.specialty.split(",").map(s => s.trim()).filter(Boolean) : []);
  let displaySpecialties = "מנחה/חוקר";
  if (specialtiesList.length > 0) {
    if (specialtiesList.length > 2) {
      displaySpecialties = specialtiesList.slice(0, 2).join(", ") + ", ...";
    } else {
      displaySpecialties = specialtiesList.join(", ");
    }
  } else if (mentor.specialty) {
    displaySpecialties = mentor.specialty;
  }

  return (
    <section className="apprentice-portal-card" dir="rtl">
      <div className="apprentice-portal-header">
        <div className="apprentice-portal-avatar-wrapper">
          {mentor.profileImage ? (
            <img 
              src={mentor.profileImage} 
              alt={mentor.name} 
              className="apprentice-portal-img" 
            />
          ) : (
            <div style={{fontSize: '2.5rem', display: 'grid', placeItems: 'center', height: '100%', background: '#f8fafc', color: '#cbd5e1'}}>👤</div>
          )}
        </div>
      </div>

      <div className="apprentice-portal-body">
        <h2 className="apprentice-portal-name">{mentor.name}</h2>
        
        <div className="apprentice-badges-wrapper">
          <span className="apprentice-portal-subtitle">
            {displaySpecialties}
          </span>
        </div>

        <div className="apprentice-portal-details">
          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">תחום התמחות:</span>
            <span className="apprentice-detail-value">{displaySpecialties}</span>
          </div>

          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">תארים:</span>
            <span className="apprentice-detail-value">{mentor.degrees}</span>
          </div>

          <div className="apprentice-detail-row">
            <span className="apprentice-detail-label">מין:</span>
            <span className="apprentice-detail-value">{mentor.gender || "לא צוין"}</span>
          </div>
        </div>

        <button className="apprentice-portal-btn" onClick={handleProfileClick}>
          מעבר לפרופיל המלא
        </button>
      </div>
    </section>
  );
}