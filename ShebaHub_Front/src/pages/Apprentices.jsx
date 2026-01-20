import React, { useEffect, useMemo, useState } from "react";
import ApprenticeCard from "../components/apprenticeCard";
import { FiSearch } from "react-icons/fi";
import { profilesAPI } from "../services/api";

import img1 from "../assets/student1.png";
import img2 from "../assets/student2.png";
import img3 from "../assets/student3.png";

import "../components/card.css";
import "../styles/Apprentices.css";

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
    availability: "זמינה למחקר קליני",
    isAvailableForResearch: true,
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
    availability: "זמינה למחקר קליני",
    isAvailableForResearch: true,
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
    availability: "זמינה למחקר קליני",
    isAvailableForResearch: true,
  },
];

export default function Apprentices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showReal, setShowReal] = useState(false);
  const [realStudents, setRealStudents] = useState([]);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!showReal) return;
      if (realStudents.length > 0) return;

      setRealLoading(true);
      setRealError(null);
      try {
        const data = await profilesAPI.listStudents();
        const list = Array.isArray(data) ? data : data?.results || [];
        if (!isMounted) return;
        setRealStudents(list);
      } catch (err) {
        if (!isMounted) return;
        setRealError(err?.data?.detail || "לא הצלחתי לטעון מתלמדים אמיתיים");
      } finally {
        if (isMounted) setRealLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [showReal, realStudents.length]);

  const mappedRealApprentices = useMemo(() => {
    return (realStudents || []).map((s) => ({
      id: s.id,
      name: s.name || "",
      gender: s.genderDisplay || s.gender || "",
      email: s.email || "",
      school_beginner_year: s.startYear ? String(s.startYear) : "",
      medical_level: s.apprenticeStage || "",
      Educational_institution: s.institution || "",
      profileImage: s.avatarUrl || null,
      isAvailableForResearch: s.isAvailableForResearch,
    }));
  }, [realStudents]);

  const activeList = showReal ? mappedRealApprentices : mockApprentices;

  const filteredApprentices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeList;

    return activeList.filter((a) => {
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
  }, [searchQuery, activeList]);

  return (
    <div className="apprentices-page" dir="rtl">

      <div className="page-intro-wrapper">
          <div className="page-intro-card">
            <h1 className="page-intro-title">הכירו את שותפי המחקר הבאים שלכם</h1>            
            <p className="page-intro-description">
              כאן תוכלו למצוא את דור העתיד של החוקרים בשיבא. המאגר מציג סטודנטים לרפואה 
              ומתלמדים המשתלבים בפרויקטים מחקריים במחלקות השונות.
            </p>
          </div>
        </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setShowReal((v) => !v)}
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            background: showReal ? "#111827" : "white",
            color: showReal ? "white" : "#111827",
            padding: "8px 12px",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showReal ? "מציג מתלמדים אמיתיים (לחץ למוק)" : "הצג מתלמדים אמיתיים (זמני)"}
        </button>
      </div>

      {showReal && realLoading && (
        <p className="apprentices-no-results">טוען מתלמדים אמיתיים...</p>
      )}
      {showReal && realError && (
        <p className="apprentices-no-results">{realError}</p>
      )}

      <div className="apprentices-search-row">
        <div className="apprentices-search-wrapper">
          <FiSearch className="apprentices-search-icon" />
          <input
            type="text"
            className="apprentices-search-input"
            placeholder="..חיפוש לפי שם מתלמד/ת, תחומי עניין מחקרי, זמינות למחקר ועוד"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* שינוי כאן: הוספת ה-Class הייעודי */}
    <div className="cards-grid apprentices-layout">
      {filteredApprentices.slice(0, 20).map((a) => (
        <ApprenticeCard key={a.id} apprentice={a} />
      ))}
    </div>

      {filteredApprentices.length === 0 && (
        <p className="apprentices-no-results">לא נמצאו תוצאות.</p>
      )}
    </div>
  );
}
