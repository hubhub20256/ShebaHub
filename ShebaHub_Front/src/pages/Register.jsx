import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton, FormSelect } from "../components/forms";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
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
    "This password is too common.": "הסיסמה נפוצה מדי",
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
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    agreed: false,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    if (!formData.password || formData.password.length < 8)
      newErrors.password = "הסיסמה חייבת להכיל לפחות 8 תווים";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "הסיסמאות אינן תואמות";
    if (!formData.agreed) newErrors.agreed = "חובה לאשר את תנאי השימוש";

    setErrors(newErrors);
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

      // Update auth context with user data
      login(response.user);

      // Redirect to create profile page
      navigate("/create-profile");
    } catch (error) {
      console.error("Registration failed:", error);
      
      if (error.data) {
        // Handle specific field errors from backend - translate to Hebrew
        const newErrors = {};
        
        if (error.data.email) {
          const emailError = Array.isArray(error.data.email) 
            ? error.data.email[0] 
            : error.data.email;
          newErrors.email = translateError(emailError);
        }
        if (error.data.password) {
          const passError = Array.isArray(error.data.password) 
            ? error.data.password[0] 
            : error.data.password;
          newErrors.password = translateError(passError);
        }
        if (error.data.confirmPassword) {
          const confirmError = Array.isArray(error.data.confirmPassword) 
            ? error.data.confirmPassword[0] 
            : error.data.confirmPassword;
          newErrors.confirmPassword = translateError(confirmError);
        }
        if (error.data.firstName) {
          const firstNameError = Array.isArray(error.data.firstName) 
            ? error.data.firstName[0] 
            : error.data.firstName;
          newErrors.firstName = translateError(firstNameError);
        }
        if (error.data.lastName) {
          const lastNameError = Array.isArray(error.data.lastName) 
            ? error.data.lastName[0] 
            : error.data.lastName;
          newErrors.lastName = translateError(lastNameError);
        }
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        } else if (error.data.detail) {
          setServerError(translateError(error.data.detail));
        } else if (error.data.non_field_errors) {
          setServerError(translateError(error.data.non_field_errors[0]));
        } else {
          setServerError("אירעה שגיאה בהרשמה, נסה שנית");
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
      ברוכה הבאה
    </>
  );

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
          type="password"
          name="password"
          placeholder="סיסמה (לפחות 8 תווים)"
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
          placeholder="בחר מגדר..."
          value={formData.gender}
          onChange={handleChange}
          error={errors.gender}
          disabled={isLoading}
          options={[
            { value: "woman", label: "אישה" },
            { value: "man", label: "גבר" },
            { value: "other", label: "אחר" },
          ]}
        />
        <div className="register-checkbox-container">
          <label className="register-checkbox-label">
            הסכמה לתנאי שימוש
            <input
              type="checkbox"
              name="agreed"
              checked={formData.agreed}
              onChange={handleChange}
              disabled={isLoading}
            />
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
