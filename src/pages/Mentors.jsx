import React from "react";
import MentorCard from "../components/mentorsCard";

const mockMentors = [
  {
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    specialty: "רפואת ילדים והתפתחות הילד",
    degrees: "דוקטור לרפואה (MD)",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה"
  },
  {
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    specialty: "כירורגיה לב-חזה וצנתורים",
    degrees: "דוקטור לרפואה (MD) ו-PhD בפיזיולוגיה",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם"
  },
  {
    id: 3,
    gender: "נקבה",
    email: "michal.s@clinic-test.org",
    specialty: "נוירולוגיה קלינית",
    degrees: "דוקטור לרפואה (MD) בהצטיינות יתרה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב"
  }
];

export default function Mentors() {
  return (
    <div style={{ padding: 24 }} dir="rtl">
      <h1 style={{ marginBottom: 12 }}>Mentors</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {mockMentors.map((m) => (
          <MentorCard key={m.id} mentor={m} />
        ))}
      </div>
    </div>
  );
}