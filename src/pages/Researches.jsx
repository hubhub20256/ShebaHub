import React from "react";
import ResearchCard from "../components/ResearchCard";
import "../components/card.css";

const demoResearches = [
  {
    id: "1",
    title: "נושא המחקר",
    description: "תיאור קצר של המחקר לדוגמה",
    field: "קרדיולוגיה",
    apprentices: "2",
  },
  {
    id: "2",
    title: "נושא המחקר",
    description: "תיאור קצר של המחקר לדוגמה",
    field: "נוירולוגיה",
    apprentices: "1",
  },
  {
    id: "3",
    title: "נושא המחקר",
    description: "תיאור קצר של המחקר לדוגמה",
    field: "רפואת ילדים",
    apprentices: "3",
  },
  {
    id: "4",
    title: "נושא המחקר",
    description: "תיאור קצר של המחקר לדוגמה",
    field: "אונקולוגיה",
    apprentices: "1",
  },
];

export default function Researches() {
  return (
    <div style={{ padding: 24 }} dir="rtl">
      <h1 style={{ marginBottom: 12 }}>מחקרים</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {demoResearches.map((m) => (
          <ResearchCard key={m.id} research={m} />
        ))}
      </div>
    </div>
  );
}