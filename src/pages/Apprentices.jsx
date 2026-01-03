import React, { useMemo, useState } from "react";
import ApprenticeCard from "../components/apprenticeCard";
import { FiSearch } from "react-icons/fi";

import img1 from "../assets/student1.png";
import img2 from "../assets/student2.png";
import img3 from "../assets/student3.png";

import "../components/card.css";

const mockApprentices = [
  {
    name: "דנה כהן",
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    school_beginner_year: "2019",
    medical_level: "סטודנט שנה 3",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה",
    profileImage: img1,
  },
  {
    name: "יותם לוי",
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    school_beginner_year: "2015",
    medical_level: "סטאזר",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם",
    profileImage: img2,
  },
  {
    name: "מיכל שמש",
    id: 3,
    gender: "נקבה",
    email: "michal.s@clinic-test.org",
    school_beginner_year: "20214",
    medical_level: "מתמחה בביורפואה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב",
    profileImage: img3,
  },
];

export default function Apprentices() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApprentices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mockApprentices;

    return mockApprentices.filter((a) => {
      const haystack = [
        a.name,
        a.medical_level,
        a.Educational_institution,
        a.school_beginner_year,
        a.gender,
        a.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [searchQuery]);

  return (
    <div className="page-wrapper" dir="rtl">
      <h1 className="main-title">מתלמדים</h1>

      <div className="search-row">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input with-icon"
            placeholder="..חיפוש לפי שם מתלמד/ת, תחומי עניין מחקרי, זמינות למחקר ועוד"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="cards-grid">
        {filteredApprentices.slice(0, 20).map((a) => (
          <ApprenticeCard key={a.id} apprentice={a} />
        ))}
      </div>

      {filteredApprentices.length === 0 && (
        <p className="no-results">לא נמצאו תוצאות.</p>
      )}
    </div>
  );
}
