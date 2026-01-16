import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ResearchCard from "../components/researchCard";
import { FiSearch } from "react-icons/fi";
import "../components/card.css";
import "../styles/Researches.css";
import { researchAPI } from "../services/api";

const mockResearches = [
  {
    id: 1,
    title: "השפעת בינה מלאכותית על אבחון מוקדם",
    description: "בחינת שימוש בלמידת מכונה לאבחון מוקדם של מחלות כרוניות.",
    fields: ["בינה מלאכותית", "למידת מכונה", "רפואה פנימית"],
    mentors: ['ד"ר דנה כהן', "פרופ' יותם לוי"],
    apprenticesCount: 3,
    startDate: "2025-10-01",
    hoursScope: "4–6 שעות בשבוע",
    duration: "3 חודשים",
    rewards: "תעודה, מכתב המלצה, קרדיט בפרסום (בכפוף לתרומה)",
  },
  {
    id: 2,
    title: "נוירופלסטיות לאחר אירוע מוחי",
    description: "מחקר קליני הבוחן תהליכי שיקום נוירולוגי לאחר שבץ מוחי.",
    fields: ["נוירולוגיה", "שיקום"],
    mentors: ["פרופ' מיכאל לוי"],
    apprenticesCount: 2,
    startDate: "2024-03-15",
    hoursScope: "6–8 שעות בשבוע",
    duration: "6 חודשים",
    rewards: "מכתב המלצה, אפשרות להצגה בכנס פנימי",
  },
  {
    id: 3,
    title: "חדשנות בצנתורים זעיר־פולשניים",
    description: "פיתוח טכניקות מתקדמות בצנתורי לב עם מינימום סיבוכים.",
    fields: ["קרדיולוגיה", "כירורגיה"],
    mentors: ['ד"ר יותם לוי'],
    apprenticesCount: 4,
    startDate: "2026-01-05",
    hoursScope: "2–4 שעות בשבוע",
    duration: "8 שבועות",
    rewards: "שובר קורס/הכשרה, מכתב המלצה",
  },
];

export default function Researches() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const [showReal, setShowReal] = useState(Boolean(location?.state?.showReal));
  const [realResearches, setRealResearches] = useState([]);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState(null);

  const splitList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value)
      .split(/[\n,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const mapApiResearchToCard = (r) => ({
    id: r.id,
    title: r.researchName,
    description: r.description,
    fields: splitList(r.researchArea),
    mentors: splitList(r.mentors),
    apprenticesCount: r.teamSize ?? "",
    startDate: r.startDate,
    hoursScope: r.weeklyHours ? `${r.weeklyHours} שעות בשבוע` : "",
    duration: r.durationWeeks ? `${r.durationWeeks} שבועות` : "",
    rewards: r.compensation || "",
    status: r.status || "",
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!showReal) return;
      if (realLoading) return;
      if (realResearches.length > 0) return;

      setRealError(null);
      setRealLoading(true);
      try {
        const data = await researchAPI.listResearches();
        if (cancelled) return;
        setRealResearches(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setRealError(err?.data?.detail || "לא הצלחתי לטעון מחקרים אמיתיים");
      } finally {
        if (!cancelled) setRealLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReal]);

  const activeList = showReal
    ? realResearches.map(mapApiResearchToCard)
    : mockResearches;

  const filteredResearches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeList;

    return activeList.filter((r) => {
      const haystack = [
        r.title,
        r.description,
        r.fields.join(" "),
        r.mentors.join(" "),
        String(r.apprenticesCount),
        r.startDate,
        r.hoursScope,
        r.duration,
        r.rewards,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [searchQuery, activeList]);

  return (
    <div className="researches-page" dir="rtl">
      <div className="page-intro-card">
        <h1 className="page-intro-title">זירת המחקר של שיבא: פרויקטים, מחקרים והזדמנויות</h1>
        
        <div className="page-intro-separator"></div>
        
        <p className="page-intro-description">
          לפניכם מאגר המחקרים הפעילים והעתידיים בבית החולים. כאן תוכלו להיחשף לחזית העשייה המדעית, 
          לעיין בפרטי המחקרים במחלקות השונות ולמצוא פרויקטים המחפשים שותפים או ליווי מחקרי.
        </p>
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
          {showReal ? "מציג מחקרים אמיתיים (לחץ למוק)" : "הצג מחקרים אמיתיים (זמני)"}
        </button>
      </div>

      {showReal && realLoading && (
        <p className="researches-no-results">טוען מחקרים אמיתיים...</p>
      )}
      {showReal && realError && (
        <p className="researches-no-results">{realError}</p>
      )}

      <div className="researches-search-row">
        <div className="researches-search-wrapper">
          <FiSearch className="researches-search-icon" />
          <input
            type="text"
            className="researches-search-input"
            placeholder="חיפוש לפי שם, תחום, מנחה, שעות, משך, גמולים"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="cards-grid">
        {filteredResearches.slice(0, 20).map((r) => (
          <ResearchCard key={r.id} research={r} isReal={showReal} />
        ))}
      </div>

      {filteredResearches.length === 0 && (
        <p className="researches-no-results">לא נמצאו מחקרים תואמים.</p>
      )}
    </div>
  );
}
