import React from "react";
import { Link } from "react-router-dom";
import "./card.css";

export default function ResearchCard({ research, isReal = false }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const fields = Array.isArray(research.fields) ? research.fields : [];
  const mentors = Array.isArray(research.mentors) ? research.mentors : [];
  const to = {
    pathname: `/research/${research.id}`,
  };

  return (
    <div className="researchCard" dir="rtl">
      <h3 className="researchCard__title">
        <Link
          to={to}
          state={isReal ? { source: "real" } : undefined}
          style={{ color: "inherit", textDecoration: "none" }}
        >
          {research.title}
        </Link>
      </h3>

      <div className="researchCard__fields">
        {fields.map((field) => (
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
            {mentors.join(", ")}
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
