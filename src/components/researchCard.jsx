import React from "react";
import "./card.css";

export default function ResearchCard({ research }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="researchCard" dir="rtl">
      <h3 className="researchCard__title">{research.title}</h3>

      <div className="researchCard__fields">
        {research.fields.map((field) => (
          <span key={field} className="researchCard__field">
            {field}
          </span>
        ))}
      </div>

      <p className="researchCard__description">
        {research.description}
      </p>

      <div className="researchCard__details">
        <div className="researchCard__detail">
          <span className="researchCard__label">מנחים:</span>
          <span className="researchCard__value">
            {research.mentors.join(", ")}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">מספר מתלמדים:</span>
          <span className="researchCard__value">
            {research.apprenticesCount}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">תחילת מחקר:</span>
          <span className="researchCard__value">
            {formatDate(research.startDate)}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">היקף שעות זמינות:</span>
          <span className="researchCard__value">
            {research.hoursScope}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">משך המחקר:</span>
          <span className="researchCard__value">
            {research.duration}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">גמולים:</span>
          <span className="researchCard__value">
            {research.rewards}
          </span>
        </div>
      </div>
    </div>
  );
}
