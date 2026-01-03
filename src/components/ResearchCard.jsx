import "./card.css";

export default function ResearchCard({ research }) {
  return (
    <article className="card researchCard" dir="rtl">
      {/* <button className="bookmark-btn" type="button" aria-label="שמירה">
        <span className="bookmark-icon">🔖</span>
      </button> */}

      <h3 className="researchCard__title">{research.title}</h3>

      <div className="researchCard__content">
        <div className="researchCard__lines">
          <div className="researchCard__line" />
          <div className="researchCard__line" />
          <div className="researchCard__line" />
          <div className="researchCard__line" />
        </div>

        <div className="researchCard__labels">
          <div><strong>שם המחקר:</strong> {research.title}</div>
          <div><strong>תיאור המחקר:</strong> {research.description}</div>
          <div><strong>תחומי המחקר:</strong> {research.field}</div>
          <div><strong>מנחים:</strong> {research.apprentices}</div>
        </div>
      </div>
    </article>
  );
}
