import React, { useEffect, useMemo, useState } from "react";
import MentorCard from "../components/mentorsCard";
import image1 from "../assets/mentor1.jpg";
import image2 from "../assets/mentor2.jpg";
import image3 from "../assets/mentor3.jpg";
import "../components/card.css";
import "../styles/Mentors.css";
import { FiSearch } from "react-icons/fi";
import { profilesAPI } from "../services/api";


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
  const [showReal, setShowReal] = useState(false);
  const [realMentors, setRealMentors] = useState([]);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!showReal) return;
      if (realMentors.length > 0) return;

      setRealLoading(true);
      setRealError(null);
      try {
        const data = await profilesAPI.listMentors();
        const list = Array.isArray(data) ? data : data?.results || [];
        if (!isMounted) return;
        setRealMentors(list);
      } catch (err) {
        if (!isMounted) return;
        setRealError(err?.data?.detail || "לא הצלחתי לטעון מנחים אמיתיים");
      } finally {
        if (isMounted) setRealLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [showReal, realMentors.length]);

  const mappedRealMentors = useMemo(() => {
    return (realMentors || []).map((m) => ({
      id: m.id,
      name: m.name || "",
      gender: m.genderDisplay || m.gender || "",
      email: m.email || "",
      specialty: m.specialty || "",
      degrees: Array.isArray(m.degrees) ? m.degrees.filter(Boolean).join(", ") : (m.degrees || ""),
      Educational_institution: m.institution || "",
      profileImage: m.avatarUrl || null,
    }));
  }, [realMentors]);

  const activeList = showReal ? mappedRealMentors : mockMentors;

  const filteredMentors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeList;

    return activeList.filter((m) => {
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
  }, [searchQuery, activeList]);

  return (
    <div className="mentors-page" dir="rtl">
      <h1 className="mentors-title">מנחים</h1>

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
          {showReal ? "מציג מנחים אמיתיים (לחץ למוק)" : "הצג מנחים אמיתיים (זמני)"}
        </button>
      </div>

      {showReal && realLoading && (
        <p className="mentors-no-results" dir="rtl">טוען מנחים אמיתיים...</p>
      )}
      {showReal && realError && (
        <p className="mentors-no-results" dir="rtl">{realError}</p>
      )}

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
