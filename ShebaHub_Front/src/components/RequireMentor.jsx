import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireMentor({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div dir="rtl" style={{ padding: 24, textAlign: "right", fontWeight: 700 }}>
        בודק הרשאות...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!user.has_mentor_profile) return <Navigate to="/researches" replace />;

  return children;
}
