import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton } from "../components/forms";
import { authAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import "../styles/Login.css";

const ResetPassword = () => {
  usePageTitle("איפוס סיסמה");
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (serverError) setServerError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.password || formData.password.length < 14)
      newErrors.password = "הסיסמה חייבת להכיל לפחות 14 תווים";
    if (formData.password && formData.password.length > 64)
      newErrors.password = "הסיסמה יכולה להכיל לכל היותר 64 תווים";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "הסיסמאות אינן תואמות";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError("");
    try {
      await authAPI.confirmPasswordReset(uid, token, formData.password, formData.confirmPassword);
      setSuccess(true);
    } catch (error) {
      if (error.data) {
        if (error.data.token) {
          setServerError("קישור האיפוס אינו תקף או שפג תוקפו");
        } else if (error.data.uid) {
          setServerError("קישור האיפוס אינו תקף");
        } else if (error.data.password) {
          const msg = Array.isArray(error.data.password) ? error.data.password[0] : error.data.password;
          setErrors({ password: msg });
        } else {
          setServerError("אירעה שגיאה, נסה שנית");
        }
      } else {
        setServerError("אירעה שגיאה בתקשורת, נסה שנית מאוחר יותר");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!uid || !token) {
    return (
      <AuthLayout
        title="איפוס סיסמה"
        subtitle=""
        footerText=""
        footerLinkText="חזרה להתחברות"
        footerPath="/login"
      >
        <div className="login-form" style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ color: "var(--error-color, #b91c1c)" }}>
            קישור האיפוס אינו תקף
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="איפוס סיסמה"
      subtitle=""
      footerText=""
      footerLinkText="חזרה להתחברות"
      footerPath="/login"
    >
      {success ? (
        <div className="login-form" style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: "1.1rem", color: "var(--text-color)" }}>
            הסיסמה אופסה בהצלחה!
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
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-form">
          {serverError && <div className="login-error">{serverError}</div>}
          <FormInput
            type="password"
            name="password"
            placeholder="סיסמה חדשה (14-64 תווים)"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
          />
          <FormInput
            type="password"
            name="confirmPassword"
            placeholder="אימות סיסמה חדשה"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            disabled={isLoading}
          />
          <FormButton disabled={isLoading}>
            {isLoading ? "מאפס..." : "איפוס סיסמה"}
          </FormButton>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
