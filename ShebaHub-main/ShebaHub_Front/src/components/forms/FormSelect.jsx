import React from "react";

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  placeholder,
  disabled,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      {/* Optional Label above the box */}
      {label && <label style={styles.label}>{label}</label>}

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          ...styles.select,
          borderColor: error ? "red" : "#ccc",
          backgroundColor: error ? "#fff0f0" : "#fff",
          color: value ? "#000" : "#888", // Grey text if nothing selected
        }}
      >
        {/* The "Placeholder" option */}
        <option value="" disabled>
          {placeholder}
        </option>

        {/* Render the options dynamically */}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ color: "#000" }}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
};

const styles = {
  label: {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: "bold",
    fontSize: "0.9rem",
    textAlign: "right", // Ensure label is on the right
  },
  select: {
    width: "100%",
    padding: "0.8rem",
    fontSize: "1rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    direction: "rtl", // Text inside aligns right
    appearance: "none", // Removes default browser arrow (optional, keeps it clean)
    backgroundImage:
      "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')", // Custom Arrow
    backgroundRepeat: "no-repeat",
    backgroundPosition: "left 0.7rem top 50%", // Arrow on the LEFT because RTL
    backgroundSize: "0.65rem auto",
    cursor: "pointer",
  },
  errorText: {
    color: "red",
    fontSize: "0.8rem",
    marginTop: "0.2rem",
    display: "block",
    textAlign: "right",
  },
};

export default FormSelect;
