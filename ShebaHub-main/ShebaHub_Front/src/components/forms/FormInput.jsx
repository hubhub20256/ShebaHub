import React, { useState } from "react";

const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="2" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="1" y1="1" x2="23" y2="23" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

const FormInput = ({
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  disabled,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const effectiveType = isPasswordField && showPassword ? "text" : type;

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ position: "relative" }}>
        <input
          type={effectiveType}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            ...styles.input,
            borderColor: error ? "red" : "#ccc",
            backgroundColor: error ? "#fff0f0" : "#fff",
            paddingLeft: isPasswordField ? "2.5rem" : "0.8rem",
          }}
        />
        {isPasswordField && (
          <button
            type="button"
            className="eye-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            tabIndex={-1}
            aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}
      </div>
      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
};

const styles = {
  input: {
    padding: "0.8rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    textAlign: "right",
    width: "100%",
    boxSizing: "border-box",
  },
  eyeButton: {
    position: "absolute",
    left: "0.6rem",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "red",
    fontSize: "0.8rem",
    marginTop: "0.2rem",
    display: "block",
    textAlign: "right",
  },
};

export default FormInput;
