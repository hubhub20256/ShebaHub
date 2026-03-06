import React, { useCallback, useEffect, useMemo, useState } from "react";
import MentorsCard from "../components/mentorsCard";
import SearchAutocomplete from "../components/SearchAutocomplete";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { profilesAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import "../components/card.css";
import "../styles/Mentors.css";

export default function Mentors() {
  usePageTitle("מנחים");
  const [searchQuery, setSearchQuery] = useState("");
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await profilesAPI.listMentors();
        const list = Array.isArray(data) ? data : data?.results || [];
        if (isMounted) setMentors(list);
      } catch (err) {
        if (isMounted) {
          const errorMessage = err?.response?.data?.detail || err?.message || "שגיאה בטעינת מנחים";
          setError(errorMessage);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, []);

  const mappedMentors = useMemo(() => {
    return (Array.isArray(mentors) ? mentors : []).map((m) => ({
      id: m.id,
      name: m.name || "",
      gender: m.genderDisplay || m.gender || "",
      email: m.email || "",
      specialty: m.specialty || "",
      degrees: Array.isArray(m.degrees)
        ? m.degrees.filter(Boolean).join(", ")
        : (m.degrees || ""),
      Educational_institution: m.institution || "",
      profileImage: m.avatarUrl || null,
    }));
  }, [mentors]);

  const extractMentorTerms = useCallback((m) => [
    m.name,
    m.specialty,
    m.degrees,
    m.Educational_institution,
  ], []);

  const filteredMentors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mappedMentors;

    return mappedMentors.filter((m) => {
      const haystack = [
        m.name,
        m.specialty,
        m.degrees,
        m.Educational_institution,
        m.email,
        m.gender,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, mappedMentors]);

  return (
    <div className="mentors-page" dir="rtl">
      <div className="page-intro-wrapper">
        <div className="page-intro-card">
          <h1 className="page-intro-title">הכירו את המנחים למחקר בשיבא</h1>
          <p className="page-intro-description">
            מאגר המנחים של בית החולים שיבא מאגד רופאות ורופאים המובילים מחקרים פעילים
            ומלווים סטודנטים בתהליכי הכשרה אקדמיים.
          </p>
        </div>
      </div>

      {loading && <LoadingSpinner text="טוען מנחים..." />}
      {error && <p className="mentors-status-msg error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="mentors-controls-container">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="חיפוש מנחה..."
              items={mappedMentors}
              extractTerms={extractMentorTerms}
              wrapperClassName="mentors-search-row"
              innerClassName="mentors-search-wrapper"
              inputClassName="mentors-search-input"
              iconClassName="mentors-search-icon"
            />
          </div>

          <div className="cards-grid mentors-layout">
            {filteredMentors.map((m) => (
              <MentorsCard key={m.id || m.email} mentor={m} />
            ))}
          </div>

          {filteredMentors.length === 0 && (
            <EmptyState message="לא נמצאו תוצאות לחיפוש הנוכחי." />
          )}
        </>
      )}
    </div>
  );
}
