import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ResearchCard from "../components/researchCard";
import SearchAutocomplete from "../components/SearchAutocomplete";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import "../components/card.css";
import "../styles/Researches.css";

export default function Researches() {
  usePageTitle("מחקרים");
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());

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
    duration: r.durationMonths ? `${r.durationMonths} חודשים` : "",
    rewards: Array.isArray(r.compensation) ? r.compensation.join(", ") : (r.compensation || ""),
    status: r.status || "",
    acceptingApplications: r.accepting_applications,
    isFull: r.isFull || false,
  });

  const loadResearches = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await researchAPI.listResearches();
      setResearches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.data?.detail || "שגיאה בטעינת מחקרים");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadJoinedIds = useCallback(async () => {
    if (!user) return;
    try {
      const data = await researchAPI.listJoinedResearches();
      if (Array.isArray(data)) {
        setJoinedIds(new Set(data.map((r) => r.id)));
      }
    } catch { /* non-blocking */ }
  }, [user]);

  useEffect(() => {
    loadResearches();
  }, [loadResearches]);

  useEffect(() => {
    loadJoinedIds();
  }, [loadJoinedIds]);

  // Re-fetch when page regains focus (throttled to once per 30s)
  const lastFocusRef = useRef(0);
  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusRef.current < 30000) return;
      lastFocusRef.current = now;
      loadResearches();
      loadJoinedIds();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadResearches, loadJoinedIds]);

  const activeList = useMemo(
    () => researches.map(mapApiResearchToCard),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [researches]
  );

  const extractResearchTerms = useCallback((r) => [
    r.title,
    ...r.fields,
    ...r.mentors,
    r.rewards,
    r.hoursScope,
    r.duration,
  ], []);

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

      {loading && <LoadingSpinner text="טוען מחקרים..." />}
      {error && <p className="researches-no-results" style={{ color: "#dc2626" }}>{error}</p>}

      {!loading && !error && (
        <>
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="חיפוש לפי שם, תחום, מנחה, שעות, משך, גמולים"
            items={activeList}
            extractTerms={extractResearchTerms}
            wrapperClassName="researches-search-row"
            innerClassName="researches-search-wrapper"
            inputClassName="researches-search-input"
            iconClassName="researches-search-icon"
          />

          <div className="cards-grid">
            {filteredResearches.map((r) => (
              <ResearchCard key={r.id} research={r} joined={joinedIds.has(r.id)} />
            ))}
          </div>

          {filteredResearches.length === 0 && (
            <EmptyState message="לא נמצאו מחקרים תואמים." />
          )}
        </>
      )}
    </div>
  );
}
