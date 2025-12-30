import React from "react";
import ApprenticeCard from "../components/apprenticeCard";
import img1 from '../assets/student1.png';
import img2 from '../assets/student2.png';
import img3 from '../assets/student3.png';

const mockApprentices = [
  {
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    school_beginner_year: "2019",
    medical_level: "סטודנט שנה 3",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה",
    profileImage: img1
  },

  {
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    school_beginner_year: "2015",
    medical_level: "סטאזר",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם",
    profileImage: img2
  },
  {
    id: 3,
    gender: "נקבה",
    email: "michal.s@clinic-test.org",
    school_beginner_year: "20214",
    medical_level: "מתמחה בביורפואה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב",
    profileImage: img3
  }
];

export default function Apprentices() {
  return (
    <div style={{ padding: 24 }} dir="rtl">
      <h1 style={{ marginBottom: 12 }}>מתמחים</h1>

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