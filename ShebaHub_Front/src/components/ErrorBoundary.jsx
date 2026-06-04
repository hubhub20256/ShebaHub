import React from "react";

const btnBase = {
  padding: "10px 28px",
  borderRadius: "20px",
  border: "none",
  fontWeight: 600,
  fontSize: "0.95rem",
  cursor: "pointer",
  fontFamily: "inherit",
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{
            textAlign: "center",
            padding: "60px 20px",
            fontFamily: "Rubik, system-ui, sans-serif",
            color: "var(--text-color, #2C2C6C)",
          }}
        >
          <h2 style={{ marginBottom: "12px" }}>משהו השתבש</h2>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            אירעה שגיאה בלתי צפויה. נסו לרענן את הדף.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{ ...btnBase, background: "#2C2C6C", color: "white" }}
            >
              נסה שוב
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ ...btnBase, background: "white", color: "#2C2C6C", border: "1px solid #2C2C6C" }}
            >
              רענן דף
            </button>
            <a
              href="/"
              style={{ ...btnBase, background: "white", color: "#666", border: "1px solid #ddd", textDecoration: "none", display: "inline-block" }}
            >
              חזרה לדף הבית
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
