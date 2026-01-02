import "./card.css";

export default function MentorsCard({ mentor }) {
  return (
    <section className="mentorCard" dir="rtl">

      <header className="mentorCard__header">
        <div className="mentorCard__avatar">
          {mentor.profileImage ? (
            <img
              src={mentor.profileImage}
              alt={`${mentor.name || 'mentor'} avatar`}
              className="mentorCard__img"
            />
          ) : (
            <span style={{ color: 'white' }}>?</span>
          )}
        </div>
        <h2 className="mentorCard__title">{mentor.name}</h2>
      </header>

      <div className="mentorCard__content">
    
        <div className="mentorCard__boxes">
  
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mentorCard__box" />
          ))}
        </div>

        <aside className="mentorCard__side">
    
          <div className="mentorCard__labels">
            <div><strong>מין:</strong> {mentor.gender}</div>
            <div><strong>דואר אלקטרוני:</strong> {mentor.email}</div>
            <div><strong>תחום התמחות:</strong> {mentor.specialty}</div>
            <div><strong>תארים:</strong> {mentor.degrees}</div>
            <div><strong>מוסד לימודים:</strong> {mentor.Educational_institution}</div>
          </div>
        </aside>
      </div>
    </section>
  );
}