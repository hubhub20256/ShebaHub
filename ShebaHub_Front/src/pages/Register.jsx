import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton, FormSelect } from "../components/forms";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import usePageTitle from "../hooks/usePageTitle";
import { scrollToFirstError } from "../utils/formValidation";
import "../styles/Register.css";

// תרגום שגיאות מאנגלית לעברית
const translateError = (error) => {
  const translations = {
    // שגיאות אימייל
    "A user with this email already exists.": "משתמש עם כתובת אימייל זו כבר קיים",
    "Enter a valid email address.": "נא להזין כתובת אימייל תקינה",
    "This field is required.": "שדה חובה",
    "This field may not be blank.": "שדה זה לא יכול להיות ריק",
    // שגיאות סיסמה
    "This password is too short. It must contain at least 8 characters.": "הסיסמה קצרה מדי. היא חייבת להכיל לפחות 8 תווים",
    "This password is too common.": "הסיסמה נפוצה מדי, בבקשה בחר בסיסמה אחרת",
    "This password is entirely numeric.": "הסיסמה לא יכולה להכיל רק מספרים",
    "The password is too similar to the email address.": "הסיסמה דומה מדי לכתובת האימייל",
    "Passwords do not match.": "הסיסמאות אינן תואמות",
    // שגיאות כלליות
    "Invalid credentials": "פרטי ההתחברות שגויים",
    "User not found": "משתמש לא נמצא",
  };
  return translations[error] || error;
};

const Register = () => {
  usePageTitle("הרשמה");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
    gender: "",
    agreed: false,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (serverError) setServerError("");
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.firstName) newErrors.firstName = "שם פרטי הוא שדה חובה";
    if (!formData.lastName) newErrors.lastName = "שם משפחה הוא שדה חובה";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email))
      newErrors.email = "נא להזין כתובת אימייל תקינה";
    if (formData.email && formData.confirmEmail !== formData.email)
      newErrors.confirmEmail = "כתובות האימייל אינן תואמות";

    if (!formData.password || formData.password.length < 14)
      newErrors.password = "הסיסמה חייבת להכיל לפחות 14 תווים";
    if (formData.password && formData.password.length > 64)
      newErrors.password = "הסיסמה יכולה להכיל לכל היותר 64 תווים";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "הסיסמאות אינן תואמות";
    if (!formData.agreed) newErrors.agreed = "חובה לאשר את תנאי השימוש";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => scrollToFirstError(newErrors), 100);
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setServerError("");

    try {
      const response = await authAPI.signup({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender || undefined,
      });

      // Update auth context
      login(response.user);
      // If already verified (e.g. dev mode), go straight to create-profile
      if (response.user?.email_verified) {
        navigate("/create-profile");
        return;
      }
      // Otherwise show "check your email" message
      setRegistrationComplete(true);
    } catch (error) {
      if (error.data && Object.keys(error.data).length > 0) {
        // Handle specific field errors from backend - translate to Hebrew
        // Backend 409 returns {code, message, details: {field: [...]}}
        const fieldErrors = error.data.details || error.data;
        const newErrors = {};

        // Map of backend field names to form field names
        const fieldMap = ['email', 'password', 'confirmPassword', 'firstName', 'lastName'];
        for (const field of fieldMap) {
          if (fieldErrors[field]) {
            const msg = Array.isArray(fieldErrors[field])
              ? fieldErrors[field][0]
              : fieldErrors[field];
            newErrors[field] = translateError(msg);
          }
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          setTimeout(() => scrollToFirstError(newErrors), 100);
        } else if (error.data.message) {
          setServerError(translateError(error.data.message));
        } else if (error.data.detail) {
          setServerError(translateError(error.data.detail));
        } else if (error.data.non_field_errors) {
          setServerError(translateError(error.data.non_field_errors[0]));
        } else {
          // Extract the first error from any unhandled field
          const allKeys = Object.keys(fieldErrors);
          const firstKey = allKeys.find(k => fieldErrors[k]);
          if (firstKey) {
            const msg = Array.isArray(fieldErrors[firstKey])
              ? fieldErrors[firstKey][0]
              : fieldErrors[firstKey];
            setServerError(translateError(msg));
          } else {
            setServerError("אירעה שגיאה בהרשמה, נסה שנית");
          }
        }
      } else {
        setServerError("אירעה שגיאה בתקשורת, נסה שנית מאוחר יותר");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const description = (
    <>
      ברוכ/ה הבא/ה
    </>
  );

  if (registrationComplete) {
    return (
      <AuthLayout
        title="הרשמה הושלמה"
        subtitle=""
        footerText=""
        footerLinkText="לדף הבית"
        footerPath="/"
      >
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: "1.1rem", color: "var(--text-color)", marginBottom: "12px" }}>
            נשלח אליך אימייל לאימות כתובת הדואר האלקטרוני
          </p>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            בדוק/י את תיבת הדואר ולחץ/י על הקישור לאימות
          </p>
          <Link
            to="/create-profile"
            style={{
              display: "inline-block",
              marginTop: "20px",
              color: "var(--profile-accent-teal, #00bfa5)",
              fontWeight: 700,
            }}
          >
            ליצירת פרופיל
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="הרשמה"
      subtitle={description}
      footerText="כבר יש לך חשבון?"
      footerLinkText="להתחברות"
      footerPath="/login"
    >
      <form onSubmit={handleSubmit} className="register-form">
        {serverError && <div className="register-error">{serverError}</div>}
        
        <FormInput
          name="firstName"
          placeholder="שם פרטי"
          value={formData.firstName}
          onChange={handleChange}
          error={errors.firstName}
          disabled={isLoading}
        />
        <FormInput
          name="lastName"
          placeholder="שם משפחה"
          value={formData.lastName}
          onChange={handleChange}
          error={errors.lastName}
          disabled={isLoading}
        />
        <FormInput
          type="email"
          name="email"
          placeholder="דואר אלקטרוני"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
        />
        <FormInput
          type="email"
          name="confirmEmail"
          placeholder="אימות דואר אלקטרוני"
          value={formData.confirmEmail}
          onChange={handleChange}
          error={errors.confirmEmail}
          disabled={isLoading}
        />
        <FormInput
          type="password"
          name="password"
          placeholder="סיסמה (14-64 תווים)"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
        />
        <FormInput
          type="password"
          name="confirmPassword"
          placeholder="אימות סיסמה"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          disabled={isLoading}
        />
        <FormSelect
          name="gender"
          placeholder="לשון פנייה..."
          value={formData.gender}
          onChange={handleChange}
          error={errors.gender}
          disabled={isLoading}
          options={[
            { value: "male", label: "זכר" },
            { value: "female", label: "נקבה" },
            { value: "other", label: "אחר" },
          ]}
        />
        <div className="register-checkbox-container">
          <label className="register-checkbox-label">
            <input
              type="checkbox"
              name="agreed"
              checked={formData.agreed}
              onChange={handleChange}
              disabled={isLoading}
            />
            <span>הסכמה ל<a href="/about" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>תנאי שימוש</a></span>
          </label>
        </div>
        {errors.agreed && (
          <span className="register-error">
            {errors.agreed}
          </span>
        )}
        <FormButton disabled={isLoading}>
          {isLoading ? "נרשם..." : "הרשמה"}
        </FormButton>
      </form>
    </AuthLayout>
  );
};

export default Register;
