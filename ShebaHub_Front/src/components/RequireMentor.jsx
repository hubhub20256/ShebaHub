import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profilesAPI } from "../services/api";

export default function RequireMentor({ children }) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        if (!cancelled) setChecking(false);
        return;
      }
      try {
        await profilesAPI.getMyMentorProfile();
        if (!cancelled) setIsMentor(true);
      } catch {
        if (!cancelled) setIsMentor(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  if (checking) {
    return (
      <div dir="rtl" style={{ padding: 24, textAlign: "right", fontWeight: 700 }}>
        בודק הרשאות...
      </div>
    );
  }

  if (!isMentor) return <Navigate to="/researches" replace />;

  return children;
}
