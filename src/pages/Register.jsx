import React, { useState } from "react";
// 1. Import useNavigate
import { useNavigate } from "react-router-dom"; 
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton, FormSelect } from "../components/forms";

const Register = () => {
  // 2. Initialize the navigate function
  const navigate = useNavigate();

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
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

    if (!formData.password || formData.password.length < 6)
      newErrors.password = "הסיסמה חייבת להכיל לפחות 6 תווים";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "הסיסמאות אינן תואמות";
    if (!formData.agreed) newErrors.agreed = "חובה לאשר את תנאי השימוש";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("Form Validated & Submitted:", formData);
      // 3. Navigate to the create-profile route
      navigate("/create-profile"); 
    } else {
      console.log("Validation Failed");
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
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}
      >
        <FormInput
          name="firstName"
          placeholder="שם פרטי"
          value={formData.firstName}
          onChange={handleChange}
          error={errors.firstName}
        />
        <FormInput
          name="lastName"
          placeholder="שם משפחה"
          value={formData.lastName}
          onChange={handleChange}
          error={errors.lastName}
        />
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
        <FormInput
          type="password"
          name="confirmPassword"
          placeholder="אימות סיסמה"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <FormSelect
          name="gender"
          placeholder="בחר מגדר..."
          value={formData.gender}
          onChange={handleChange}
          error={errors.gender}
          options={[
            { value: "female", label: "נקבה" },
            { value: "male", label: "זכר" },
            { value: "other", label: "אחר" },
          ]}
        />
        <div style={styles.checkboxContainer}>
          <label style={styles.checkboxLabel}>
            הסכמה לתנאי שימוש
            <input
              type="checkbox"
              name="agreed"
              checked={formData.agreed}
              onChange={handleChange}
            />
          </label>
        </div>
        {errors.agreed && (
          <span
            style={{ color: "red", textAlign: "center", fontSize: "0.8rem" }}
          >
            {errors.agreed}
          </span>
        )}
        <FormButton>הרשמה</FormButton>
      </form>
    </AuthLayout>
  );
};

const styles = {
  radioGroup: {
    display: "flex",
    justifyContent: "center",
    gap: "1.5rem",
    marginTop: "1rem",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  checkboxContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "1rem",
  },
  checkboxLabel: {
    display: "flex",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
};

export default Register;