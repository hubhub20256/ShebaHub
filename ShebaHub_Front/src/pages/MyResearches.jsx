import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResearchCard from "../components/researchCard";
import { researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MyResearches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [didRedirect, setDidRedirect] = useState(false);

  const splitList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value)
      .split(/[\n,;|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const cards = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((r) => ({
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
    }));
  }, [items]);

  useEffect(() => {
    // Fast role check: rely on auth payload flag
    setCheckingRole(true);
    setIsMentor(user?.has_mentor_profile === true);
    setCheckingRole(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (checkingRole) return;
      if (!isMentor) return;

      setLoading(true);
      setError(null);
      try {
        const data = await researchAPI.listMyResearches();
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.data?.detail || "לא הצלחתי לטעון את המחקרים שלך");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [checkingRole, isMentor]);

  // For mentors, "My researches" should land on the detailed research UI
  // (which includes the mock/real toggle + dropdown selector).
  useEffect(() => {
    if (didRedirect) return;
    if (checkingRole) return;
    if (!isMentor) return;
    if (loading || error) return;
    if (!Array.isArray(items) || items.length === 0) return;

    const firstId = items[0]?.id;
    if (!firstId) return;

    setDidRedirect(true);
    navigate(`/research/${firstId}`, { state: { source: "real" }, replace: true });
  }, [checkingRole, didRedirect, error, isMentor, items, loading, navigate]);

  return (
    <div className="researches-page" dir="rtl">
      <h1 className="researches-title">המחקרים שלי</h1>

      {checkingRole && <p className="researches-no-results">טוען...</p>}

      {!checkingRole && !isMentor && (
        <p className="researches-no-results">לא רשום לאף מחקר כרגע.</p>
      )}

      {!checkingRole && isMentor && loading && (
        <p className="researches-no-results">טוען את המחקרים שלך...</p>
      )}
      {!checkingRole && isMentor && error && (
        <p className="researches-no-results">{error}</p>
      )}

      {!checkingRole && isMentor && !loading && !error && cards.length === 0 && (
        <p className="researches-no-results">אין לך מחקרים עדיין.</p>
      )}

      {!checkingRole && isMentor && cards.length > 0 && (
        <div className="cards-grid">
          {cards.map((r) => (
            <ResearchCard key={r.id} research={r} isReal={true} />
          ))}
        </div>
      )}
    </div>
  );
}
