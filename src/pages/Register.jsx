import React, { useState } from "react";
import { Link } from "react-router-dom";

const Register = () => {
  // State to manage all form inputs
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    agreed: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
    // Add registration logic here (e.g., API call)
  };

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h1 style={styles.title}>הרשמה</h1>
        <h2 style={styles.subtitle}>ברוכ/ת הבא/ה</h2>
        <p style={styles.description}>
          כדי ליצור חשבון חדש במערכת, אנא מלאו את הפרטים הבאים.
          <br />
          ההרשמה מאפשרת גישה מלאה לפיצ'רים, שמירת נתונים אישיים, יצירת קשר עם
          מנחים, מתלמדים וניהול פרויקטים.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            name="firstName"
            placeholder="שם פרטי"
            value={formData.firstName}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="text"
            name="lastName"
            placeholder="שם משפחה"
            value={formData.lastName}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="email"
            name="email"
            placeholder="דואר אלקטרוני"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="password"
            name="password"
            placeholder="סיסמה"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="אימות סיסמה"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={styles.input}
          />

          {/* Gender Selection */}
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="gender"
                value="female"
                onChange={handleChange}
                style={styles.radioInput}
              />
              נקבה
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="gender"
                value="male"
                onChange={handleChange}
                style={styles.radioInput}
              />
              זכר
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="gender"
                value="other"
                onChange={handleChange}
                style={styles.radioInput}
              />
              אחר
            </label>
          </div>

          {/* Terms Checkbox */}
          <div style={styles.checkboxContainer}>
            <label style={styles.checkboxLabel}>
              הסכמה לתנאי שימוש ומדיניות פרטיות
              <input
                type="checkbox"
                name="agreed"
                checked={formData.agreed}
                onChange={handleChange}
                style={styles.checkboxInput}
              />
            </label>
          </div>

          {/* Although not in the screenshot crop, a form needs a submit button */}
          <button type="submit" style={styles.button}>
            הרשמה
          </button>
        </form>

        <div style={styles.footer}>
          <span>כבר יש לך חשבון? </span>
          <Link to="/login" style={styles.link}>
            להתחברות
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    direction: "rtl", // Critical for Hebrew layout
    fontFamily: "Arial, sans-serif",
  },
  formWrapper: {
    width: "100%",
    maxWidth: "500px",
    textAlign: "center",
    padding: "2rem",
  },
  title: {
    fontSize: "2.5rem",
    color: "#2c3e50", // Dark blue matches header
    marginBottom: "0.5rem",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: "1.2rem",
    marginBottom: "0.5rem",
    color: "#333",
  },
  description: {
    fontSize: "0.9rem",
    color: "#666",
    marginBottom: "2rem",
    lineHeight: "1.5",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  input: {
    padding: "0.8rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "4px", // Slight rounding looks cleaner
    textAlign: "right",
  },
  radioGroup: {
    display: "flex",
    justifyContent: "center",
    gap: "1.5rem",
    marginTop: "0.5rem",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
  },
  radioInput: {
    cursor: "pointer",
  },
  checkboxContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "1rem",
  },
  checkboxLabel: {
    display: "flex",
    flexDirection: "row-reverse", // Keeps text and checkbox aligned correctly for RTL
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  checkboxInput: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  button: {
    marginTop: "1.5rem",
    padding: "0.8rem",
    backgroundColor: "#2c3e50",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
    fontWeight: "bold",
  },
  footer: {
    marginTop: "1.5rem",
    fontSize: "0.9rem",
  },
  link: {
    color: "#000",
    fontWeight: "bold",
    textDecoration: "underline",
    marginRight: "0.3rem",
  },
};

export default Register;
