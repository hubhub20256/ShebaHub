import React from "react";

const FormButton = ({ children, type = "submit", onClick, style, disabled }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles.button, ...style, ...(disabled ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}
    >
      {children}
    </button>
  );
};

const styles = {
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
    width: "100%", // Ensure it fills the form width
  },
};

export default FormButton;
