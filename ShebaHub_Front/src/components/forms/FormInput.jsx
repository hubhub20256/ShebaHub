import React from "react";

const FormInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{
          ...styles.input,
          borderColor: error ? "red" : "#ccc",
          backgroundColor: error ? "#fff0f0" : "#fff",
        }}
      />
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
  errorText: {
    color: "red",
    fontSize: "0.8rem",
    marginTop: "0.2rem",
    display: "block",
    textAlign: "right",
  },
};

export default FormInput;
