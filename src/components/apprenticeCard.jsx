import "./apprenticeCard.css";

export default function apprenticesCard({apprentice}) {
  return (
    <section className="apprenticeCard" dir="rtl">
      <h2 className="apprenticeCard__title">{apprentice.name}</h2>

      <div className="apprenticeCard__content">
        <div className="apprenticeCard__boxes">
          <div className="apprenticeCard__box" />
          <div className="apprenticeCard__box" />
          <div className="apprenticeCard__box" />
          <div className="apprenticeCard__box" />
          <div className="apprenticeCard__box" />
        </div>

        <aside className="apprenticeCard__side">
          <div className="apprenticeCard__avatar" />
          <div className="apprenticeCard__labels">
            <div><strong>מין:</strong> {apprentice.gender}</div>
            <div><strong>דואר אלקטרוני:</strong> {apprentice.email}</div>
            <div><strong>תחילת שנת הלימודים:</strong> {apprentice.school_beginner_year}</div>
            <div><strong>מוסד לימודים:</strong> {apprentice.Educational_institution}</div>
            <div><strong>שלב בהכשרה הרפואית:</strong> {apprentice.medical_level}</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
