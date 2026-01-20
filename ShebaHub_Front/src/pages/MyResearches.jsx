import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { researchAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function MyResearches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isMentor, setIsMentor] = useState(false);

  const [createdLoading, setCreatedLoading] = useState(false);
  const [createdItems, setCreatedItems] = useState([]);

  const [joinedLoading, setJoinedLoading] = useState(false);
  const [joinedItems, setJoinedItems] = useState([]);

  const [error, setError] = useState(null);
  const [didRedirect, setDidRedirect] = useState(false);

  const createdCount = useMemo(() => (Array.isArray(createdItems) ? createdItems.length : 0), [createdItems]);
  const joinedCount = useMemo(() => (Array.isArray(joinedItems) ? joinedItems.length : 0), [joinedItems]);

  useEffect(() => {
    // Fast role check: rely on auth payload flag
    setCheckingRole(true);
    setIsMentor(user?.has_mentor_profile === true);
    setCheckingRole(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const loadCreated = async () => {
      if (checkingRole) return;
      if (!isMentor) return;

      setCreatedLoading(true);
      try {
        const data = await researchAPI.listMyResearches();
        if (cancelled) return;
        setCreatedItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.data?.detail || "לא הצלחתי לטעון את המחקרים שיצרת");
      } finally {
        if (!cancelled) setCreatedLoading(false);
      }
    };

    loadCreated();
    return () => {
      cancelled = true;
    };
  }, [checkingRole, isMentor]);

  useEffect(() => {
    let cancelled = false;

    const loadJoined = async () => {
      if (checkingRole) return;
      if (!user) return;

      setJoinedLoading(true);
      try {
        const data = await researchAPI.listJoinedResearches();
        if (cancelled) return;
        setJoinedItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (cancelled) return;
        setError(err?.data?.detail || "לא הצלחתי לטעון את המחקרים שנרשמת אליהם");
      } finally {
        if (!cancelled) setJoinedLoading(false);
      }
    };

    loadJoined();
    return () => {
      cancelled = true;
    };
  }, [checkingRole, user]);

  // Restore old UX: auto-redirect into a concrete research page (with dropdown there).
  useEffect(() => {
    if (didRedirect) return;
    if (checkingRole) return;
    if (createdLoading || joinedLoading) return;
    if (error) return;

    const firstCreatedId = Array.isArray(createdItems) && createdItems.length > 0 ? createdItems[0]?.id : null;
    const firstJoinedId = Array.isArray(joinedItems) && joinedItems.length > 0 ? joinedItems[0]?.id : null;

    const targetId = (isMentor && firstCreatedId) ? firstCreatedId : (firstJoinedId || null);
    if (!targetId) return;

    setDidRedirect(true);
    navigate(`/research/${targetId}`, { state: { source: "real" }, replace: true });
  }, [checkingRole, createdItems, createdLoading, didRedirect, error, isMentor, joinedItems, joinedLoading, navigate]);

  return (
    <div className="researches-page" dir="rtl">
      <h1 className="researches-title">המחקרים שלי</h1>

      {checkingRole && <p className="researches-no-results">טוען...</p>}

      {!checkingRole && (createdLoading || joinedLoading) && (
        <p className="researches-no-results">טוען...</p>
      )}

      {!checkingRole && !createdLoading && !joinedLoading && error && (
        <p className="researches-no-results">{error}</p>
      )}

      {!checkingRole && !createdLoading && !joinedLoading && !error && !didRedirect && createdCount === 0 && joinedCount === 0 && (
        <p className="researches-no-results">אין לך מחקרים עדיין.</p>
      )}

      {!checkingRole && !createdLoading && !joinedLoading && !error && !didRedirect && (createdCount > 0 || joinedCount > 0) && (
        <p className="researches-no-results">מעביר לעמוד מחקר...</p>
      )}
    </div>
  );
}
