import React from "react";
import ApprenticeCard from "../components/apprenticeCard";

const mockApprentices = [
  {
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    school_beginner_year: "2019",
    medical_level: "סטודנט שנה 3",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה"
  },
  {
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    school_beginner_year: "2015",
    medical_level: "סטאזר",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם"
  },
  {
    id: 3,
    gender: "נקבה",
    email: "michal.s@clinic-test.org",
    school_beginner_year: "20214",
    medical_level: "מתמחה בביורפואה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב"
  }
];

export default function Apprentices() {
  return (
    <div style={{ padding: 24 }} dir="rtl">
      <h1 style={{ marginBottom: 12 }}>Apprentices</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {mockApprentices.map((m) => (
          <ApprenticeCard key={m.id} apprentice={m} />
        ))}
      </div>
    </div>
  );
}