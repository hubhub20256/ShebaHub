import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton } from "../components/forms";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Clear error on type
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    let newErrors = {};

    if (!formData.email) newErrors.email = "נא להזין כתובת אימייל";
    if (!formData.password) newErrors.password = "נא להזין סיסמה";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      console.log("Login Data Submitted:", formData);
      // Here we will eventually add our specific Login API call
    }
  };

  return (
    <AuthLayout
      title="שמחים לראותך שוב!"
      subtitle=""
      footerText="עדיין אין לך חשבון?"
      footerLinkText="הרשמה"
      footerPath="/register"
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
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
