import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { FormInput, FormButton, FormSelect } from "../components/forms";

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
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}
      >
        {/* Avatar uploader (circle like profile) */}
        <div style={avatarStyles.wrap}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPickAvatar}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = "";
              fileInputRef.current?.click();
            }}
            style={avatarStyles.circleBtn}
            aria-label="העלאת תמונת פרופיל"
            title="העלאת תמונת פרופיל"
          >
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="תמונת פרופיל"
                style={avatarStyles.img}
              />
            ) : (
              <span style={avatarStyles.initials}>{initials || " "}</span>
            )}

            <span style={avatarStyles.badge} aria-hidden="true">
              📷
            </span>
          </button>

          <div style={avatarStyles.textWrap}>
            <div style={avatarStyles.title}>תמונת פרופיל</div>
            <div style={avatarStyles.sub}>לחצי על העיגול כדי להעלות תמונה מהמחשב</div>

            {formData.avatarUrl ? (
              <button
                type="button"
                onClick={clearAvatar}
                style={avatarStyles.removeBtn}
              >
                הסרה
              </button>
            ) : null}
          </div>
        </div>

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
          <span style={{ color: "red", textAlign: "center", fontSize: "0.8rem" }}>
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

const avatarStyles = {
  wrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 10,
    marginTop: 6,
  },
  circleBtn: {
    width: 86,
    height: 86,
    borderRadius: "50%",
    border: "none",
    padding: 0,
    cursor: "pointer",
    background: "linear-gradient(135deg, #6cd5bf, #2C2C6C)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
    position: "relative",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  initials: {
    color: "white",
    fontWeight: 800,
    fontSize: 28,
    letterSpacing: 1,
  },
  badge: {
    position: "absolute",
    bottom: 4,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "white",
    display: "grid",
    placeItems: "center",
    fontSize: 13,
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
  },
  textWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
  },
  title: {
    fontWeight: 800,
    color: "#2C2C6C",
    fontSize: 14,
  },
  sub: {
    color: "#666",
    fontSize: 12,
  },
  removeBtn: {
    marginTop: 4,
    border: "none",
    background: "transparent",
    color: "#ef67a0",
    cursor: "pointer",
    fontWeight: 700,
    padding: 0,
    fontSize: 12,
    textDecoration: "underline",
    alignSelf: "flex-start",
  },
};

export default Register;