import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import usePageTitle from "../hooks/usePageTitle";
import "../styles/Login.css";

const VerifyEmail = () => {
  usePageTitle("אימות אימייל");
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");
  const { user, updateUser } = useAuth();

  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    if (!uid || !token) {
      setStatus("error");
      return;
    }

    let cancelled = false;
    authAPI
      .verifyEmail(uid, token)
      .then(() => {
        if (!cancelled) {
          setStatus("success");
          if (user) updateUser({ email_verified: true });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, token]);

  return (
    <AuthLayout
      title="אימות אימייל"
      subtitle=""
      footerText=""
      footerLinkText="לדף הבית"
      footerPath="/"
    >
      <div className="login-form" style={{ textAlign: "center", padding: "20px 0" }}>
        {status === "loading" && (
          <p style={{ color: "var(--text-color)" }}>מאמת את כתובת האימייל...</p>
        )}
        {status === "success" && (
          <>
            <p style={{ fontSize: "1.1rem", color: "var(--text-color)" }}>
              האימייל אומת בהצלחה!
            </p>
            <Link
              to="/login"
              style={{
                display: "inline-block",
                marginTop: "16px",
                color: "var(--profile-accent-teal, #00bfa5)",
                fontWeight: 700,
              }}
            >
              להתחברות
            </Link>
          </>
        )}
        {status === "error" && (
          <p style={{ color: "var(--error-color, #b91c1c)" }}>
            קישור האימות אינו תקף או שפג תוקפו
          </p>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
