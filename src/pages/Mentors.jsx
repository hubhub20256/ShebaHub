import React, { useMemo, useState } from "react";
import MentorCard from "../components/mentorsCard";
import image1 from "../assets/mentor1.jpg";
import image2 from "../assets/mentor2.jpg";
import image3 from "../assets/mentor3.jpg";
import "../components/card.css";
import "../styles/Mentors.css";
import { FiSearch } from "react-icons/fi";


const mockMentors = [
  {
    name: "דנה כהן",
    id: 1,
    gender: "נקבה",
    email: "dana.k@med-example.com",
    specialty: "רפואת ילדים והתפתחות הילד",
    degrees: "דוקטור לרפואה (MD)",
    Educational_institution: "אוניברסיטת תל אביב - הפקולטה לרפואה",
    profileImage: image2,
  },
  {
    name: "יותם לוי",
    id: 2,
    gender: "זכר",
    email: "yotam.lev@hospital-demo.co.il",
    specialty: "כירורגיה לב-חזה וצנתורים",
    degrees: "דוקטור לרפואה (MD) ו-PhD בפיזיולוגיה",
    Educational_institution: "האוניברסיטה העברית והדסה עין כרם",
    profileImage: image1,
  },
  {
    name: "מיכאל לוי",
    id: 3,
    gender: "זכר",
    email: "michael.s@clinic-test.org",
    specialty: "נוירולוגיה קלינית",
    degrees: "דוקטור לרפואה (MD) בהצטיינות יתרה",
    Educational_institution: "אוניברסיטת בן-גוריון בנגב",
    profileImage: image3,
  },
];

export default function Mentors() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMentors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mockMentors;

    return mockMentors.filter((m) => {
      const haystack = [
        m.name,
        m.specialty,
        m.degrees,
        m.Educational_institution,
        m.email,
        m.gender,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [searchQuery]);

  return (
    <div className="mentors-page" dir="rtl">
      <h1 className="mentors-title">מנחים</h1>

      <div className="mentors-search-row" dir="rtl">
        <div className="mentors-search-wrapper">
          <FiSearch className="mentors-search-icon" />
          <input
            className="mentors-search-input with-icon"
            type="text"
            placeholder="חיפוש לפי שם מנחה, תחומי עניין מחקרי, התמחות ועוד.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
    </div>


      <div className="cards-grid">
        {filteredMentors.slice(0, 20).map((m) => (
          <MentorCard key={m.id} mentor={m} />
        ))}
      </div>

      {filteredMentors.length === 0 && (
        <p className="mentors-no-results" dir="rtl">
          לא נמצאו תוצאות.
        </p>
      )}
    </div>
  );
}
