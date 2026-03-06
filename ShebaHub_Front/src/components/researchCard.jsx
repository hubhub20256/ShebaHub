import React from "react";
import { Link } from "react-router-dom";
import "./card.css";
// Ensure your CSS classes are also in Researches.css or card.css
import "../styles/Researches.css"; 

const STATUS_MAP = {
  open: { label: "פתוח", cls: "status--open" },
  in_progress: { label: "בתהליך", cls: "status--in-progress" },
  completed: { label: "הושלם", cls: "status--completed" },
  closed: { label: "סגור", cls: "status--closed" },
  draft: { label: "טיוטה", cls: "status--draft" },
};

export default function ResearchCard({ research, joined }) {
  // Helper to format dates
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  // Ensure arrays exist to avoid .map errors
  const fields = Array.isArray(research.fields) ? research.fields : [];
  const mentors = Array.isArray(research.mentors) ? research.mentors : [];

  const to = { pathname: `/research/${research.id}` };
  const tooltip = (val) => String(val ?? "").trim();

  return (
    <Link
      to={to}
      className="researchCard researchCard--clickable"
      dir="rtl"
      style={{ color: "inherit", textDecoration: "none" }}
      aria-label={`מעבר לעמוד המחקר: ${research.title}`}
    >
      {/* 1. The Dynamic Status Badge */}
      <div className="status-badge-container">
        <span className={`research-status-badge ${STATUS_MAP[research.status]?.cls || ""}`}>
          {STATUS_MAP[research.status]?.label || research.status || "לא ידוע"}
        </span>
        <span className={`research-status-badge ${research.isFull ? "status--closed" : research.acceptingApplications === false ? "status--closed" : "status--open"}`}>
          {research.isFull ? "לא זמין להצטרפות" : research.acceptingApplications === false ? "הגשות סגורות" : "הגשות פתוחות"}
        </span>
        {joined && (
          <span className="research-status-badge" style={{ background: "#1b2a4a", color: "#fff" }}>
            הצטרפת למחקר
          </span>
        )}
      </div>

      <h3 className="researchCard__title">
        {research.title}
      </h3>

      <div className="researchCard__fields">
        {fields.map((field) => (
          <span key={field} className="researchCard__field">
            {field}
          </span>
        ))}
      </div>

      <p className="researchCard__description">{research.description}</p>

      <div className="researchCard__details">
        <div className="researchCard__detail">
          <span className="researchCard__label">מנחים:</span>
          <span
            className="researchCard__value"
            data-tooltip={tooltip(mentors.join(", "))}
          >
            {mentors.join(", ")}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">מספר מתלמדים:</span>
          <span
            className="researchCard__value"
            data-tooltip={tooltip(research.apprenticesCount)}
          >
            {research.apprenticesCount}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">תחילת מחקר:</span>
          <span
            className="researchCard__value"
            data-tooltip={tooltip(formatDate(research.startDate))}
          >
            {formatDate(research.startDate)}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">היקף שעות זמינות:</span>
          <span
            className="researchCard__value"
            data-tooltip={tooltip(research.hoursScope)}
          >
            {research.hoursScope}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">משך המחקר:</span>
          <span
            className="researchCard__value"
            data-tooltip={tooltip(research.duration)}
          >
            {research.duration}
          </span>
        </div>

        <div className="researchCard__detail">
          <span className="researchCard__label">גמולים:</span>
          <span
            className="researchCard__value"
            data-tooltip={tooltip(research.rewards)}
          >
            {research.rewards}
          </span>
        </div>
      </div>
    </Link>
  );
}