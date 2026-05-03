import React, { useCallback, useEffect, useMemo, useState } from "react";
import ApprenticeCard from "../components/apprenticeCard";
import SearchAutocomplete from "../components/SearchAutocomplete";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { profilesAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";

import "../components/card.css";
import "../styles/Apprentices.css";

export default function Apprentices() {
  usePageTitle("מתלמדים");
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await profilesAPI.listStudents();
        const list = Array.isArray(data) ? data : data?.results || [];
        if (!isMounted) return;
        setStudents(list);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.data?.detail || "שגיאה בטעינת מתלמדים");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const mappedApprentices = useMemo(() => {
    return (students || []).map((s) => ({
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
  }, [students]);

  const extractApprenticeTerms = useCallback(
    (a) => [a.name, a.medical_level, a.Educational_institution],
    [],
  );

  const filteredApprentices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mappedApprentices;

    return mappedApprentices.filter((a) => {
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
  }, [searchQuery, mappedApprentices]);

  return (
    <div className="apprentices-page" dir="rtl">
      <div className="page-intro-wrapper">
        <div className="page-intro-card">
          <h1 className="page-intro-title">הכירו את שותפי המחקר הבאים שלכם</h1>
          <p className="page-intro-description">
            כאן תוכלו למצוא את דור העתיד של החוקרים בשיבא. המאגר מציג סטודנטים
            לרפואה ומתלמדים המשתלבים בפרויקטים מחקריים במחלקות השונות.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner text="טוען מתלמדים..." />}
      {error && (
        <p className="apprentices-no-results" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="חיפוש לפי שם מתלמד/ת, תחומי עניין מחקרי, זמינות למחקר ועוד.."
            items={mappedApprentices}
            extractTerms={extractApprenticeTerms}
            wrapperClassName="apprentices-search-row"
            innerClassName="apprentices-search-wrapper"
            inputClassName="apprentices-search-input"
            iconClassName="apprentices-search-icon"
          />

          <div className="cards-grid apprentices-layout">
            {filteredApprentices.slice(0, visibleCount).map((a) => (
              <ApprenticeCard key={a.id} apprentice={a} />
            ))}
          </div>

          {visibleCount < filteredApprentices.length && (
            <div className="apprentices-load-more-wrap">
              <button
                type="button"
                className="apprentices-load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                הצג עוד מתלמדים
              </button>
            </div>
          )}

          {filteredApprentices.length === 0 && (
            <EmptyState message="לא נמצאו תוצאות." />
          )}
        </>
      )}
    </div>
  );
}
