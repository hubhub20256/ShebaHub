import React, { useMemo, useState } from "react";
import ResearchCard from "../components/researchCard";
import { FiSearch } from "react-icons/fi";
import "../components/card.css";

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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResearches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mockResearches;

    return mockResearches.filter((r) => {
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
  }, [searchQuery]);

  return (
    <div className="page-wrapper" dir="rtl">
      <h1 className="main-title">מחקרים</h1>

      <div className="search-row">
        <div className="search-input-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input with-icon"
            placeholder="חיפוש לפי שם, תחום, מנחה, שעות, משך, גמולים"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="cards-grid">
        {filteredResearches.slice(0, 20).map((r) => (
          <ResearchCard key={r.id} research={r} />
        ))}
      </div>

      {filteredResearches.length === 0 && (
        <p className="no-results">לא נמצאו מחקרים תואמים.</p>
      )}
    </div>
  );
}
