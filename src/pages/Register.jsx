import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton, FormSelect } from "../components/forms";
import "../styles/Register.css";

const Register = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    agreed: false,

    // NEW: profile image (frontend only)
    avatarUrl: "",
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

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, avatarUrl: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      // pass avatarUrl to create-profile
      navigate("/create-profile", { state: { avatarUrl: formData.avatarUrl } });
    } else {
      console.log("Validation Failed");
    }
  };

  const description = <>ברוכה הבאה</>;

  const initials = `${(formData.firstName || "").trim()[0] || ""}${
    (formData.lastName || "").trim()[0] || ""
  }`;

  return (
    <AuthLayout
      title="הרשמה"
      subtitle={description}
      footerText="כבר יש לך חשבון?"
      footerLinkText="להתחברות"
      footerPath="/login"
    >
      <form onSubmit={handleSubmit} className="register-form">
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
            />
          </label>
        </div>

        {errors.agreed && (
          <span className="register-error">
            {errors.agreed}
          </span>
        )}

        <FormButton>הרשמה</FormButton>
      </form>
    </AuthLayout>
  );
};

export default Register;
