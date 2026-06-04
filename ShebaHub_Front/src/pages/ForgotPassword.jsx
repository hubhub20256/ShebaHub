import React, { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton } from "../components/forms";
import { authAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import "../styles/Login.css";

const ForgotPassword = () => {
  usePageTitle("שחזור סיסמה");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("נא להזין כתובת אימייל");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await authAPI.requestPasswordReset(email);
      setSuccess(true);
    } catch {
      setError("אירעה שגיאה, נסה שנית מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="שחזור סיסמה"
      subtitle=""
      footerText="חזרה להתחברות"
      footerLinkText="התחברות"
      footerPath="/login"
    >
      {success ? (
        <div className="login-form" style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: "1.1rem", color: "var(--text-color)" }}>
            נשלח אליך קישור לאיפוס סיסמה
          </p>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "8px" }}>
            בדוק/י את תיבת הדואר האלקטרוני
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <FormInput
            type="email"
            name="email"
            placeholder="דואר אלקטרוני"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            error=""
            disabled={isLoading}
          />
          <FormButton disabled={isLoading}>
            {isLoading ? "שולח..." : "שלח קישור איפוס"}
          </FormButton>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
