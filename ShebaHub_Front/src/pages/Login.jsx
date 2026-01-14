import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton } from "../components/forms";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import "../styles/Login.css";

// תרגום שגיאות מאנגלית לעברית
const translateError = (error) => {
  const translations = {
    "Invalid credentials": "כתובת האימייל או הסיסמה שגויים",
    "Invalid credentials.": "כתובת האימייל או הסיסמה שגויים",
    "No active account found with the given credentials": "לא נמצא חשבון פעיל עם הפרטים שהוזנו",
    "Unable to log in with provided credentials.": "לא ניתן להתחבר עם הפרטים שהוזנו",
    "This field is required.": "שדה חובה",
    "This field may not be blank.": "שדה זה לא יכול להיות ריק",
    "Enter a valid email address.": "נא להזין כתובת אימייל תקינה",
    "User not found": "משתמש לא נמצא",
    "Incorrect password": "סיסמה שגויה",
    "Account is disabled": "החשבון מושבת",
    "Account is not active": "החשבון לא פעיל",
  };
  return translations[error] || error;
};

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (serverError) setServerError("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.email) newErrors.email = "נא להזין כתובת אימייל";
    if (!formData.password) newErrors.password = "נא להזין סיסמה";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setServerError("");

    try {
      console.log("Sending login request to server...", formData);

      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      console.log("Login successful:", response);

      // Update auth context with user data
      login(response.user);

      // Redirect based on profile status
      if (!response.user.has_mentor_profile && !response.user.has_student_profile) {
        navigate("/create-profile");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
      
      if (error.data) {
        // Handle specific error messages from backend - translate to Hebrew
        if (error.data.detail) {
          setServerError(translateError(error.data.detail));
        } else if (error.data.non_field_errors) {
          setServerError(translateError(error.data.non_field_errors[0]));
        } else if (error.data.email) {
          setErrors((prev) => ({ ...prev, email: translateError(error.data.email[0]) }));
        } else if (error.data.password) {
          setErrors((prev) => ({ ...prev, password: translateError(error.data.password[0]) }));
        } else {
          setServerError("כתובת האימייל או הסיסמה שגויים");
        }
      } else {
        setServerError("אירעה שגיאה בתקשורת, נסה שנית מאוחר יותר");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="התחברות"
      subtitle=""
      footerText="עדיין אין לך חשבון?"
      footerLinkText="הרשמה"
      footerPath="/register"
    >
      <form onSubmit={handleSubmit} className="login-form">
        {serverError && <div className="login-error">{serverError}</div>}

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
          placeholder="סיסמה"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
        />

        <FormButton disabled={isLoading}>
          {isLoading ? "מתחבר..." : "כניסה"}
        </FormButton>
      </form>
    </AuthLayout>
  );
};

export default Login;
