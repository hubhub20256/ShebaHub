import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton } from "../components/forms"; // Adjust path if needed
import { useAuth } from "../context/AuthContext";
import "../styles/Login.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(""); // New: Store "Wrong Password" errors

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (serverError) setServerError(""); // Clear server error when user types
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

    // 1. Client-side Validation (Did they type something?)
    if (!validate()) return;

    try {
      console.log("Sending data to server...", formData);

      // --- SIMULATING A REAL SERVER CHECK ---
      // In the future, this will be: const response = await api.login(formData);

      const isPasswordCorrect = checkMockCredentials(formData);

      if (isPasswordCorrect) {
        // A. Server said YES -> We update the app state
        const userData = {
          id: 1,
          name: "Israel Israeli",
          email: formData.email,
        };

        login(userData); // THIS is what switches the buttons in Navbar
        navigate("/"); // Redirect to home
      } else {
        // B. Server said NO -> We stay here and show error
        setServerError("כתובת האימייל או הסיסמה שגויים");
      }
    } catch (error) {
      console.error("Login failed", error);
      setServerError("אירעה שגיאה בתקשורת, נסה שנית מאוחר יותר");
    }
  };

  // Temporary function to simulate a Database check
  // Allows you to test "Wrong Password" vs "Correct Password"
  const checkMockCredentials = (data) => {
    // For testing: Only accept if password is "123456"
    return data.password === "123456";
  };

  return (
    <AuthLayout
      title="שמחים לראותך שוב!"
      subtitle=""
      footerText="עדיין אין לך חשבון?"
      footerLinkText="הרשמה"
      footerPath="/register"
    >
      <form onSubmit={handleSubmit} className="login-form">
        {/* Show Server Error if exists (e.g. "Wrong Password") */}
        {serverError && <div className="login-error">{serverError}</div>}

        <FormInput
          type="email"
          name="email"
          placeholder="דואר אלקטרוני"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />

        <FormInput
          type="password"
          name="password"
          placeholder="סיסמה"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />

        <FormButton>כניסה</FormButton>
      </form>
    </AuthLayout>
  );
};

export default Login;
