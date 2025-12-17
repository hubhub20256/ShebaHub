import React from "react";
import { Link } from "react-router-dom";

const AuthLayout = ({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerPath,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <h1 style={styles.title}>{title}</h1>
        {/* We allow 'subtitle' to be a string OR a JSX element (for long descriptions) */}
        <div style={styles.subtitle}>{subtitle}</div>

        {/* This is where the specific Form form the page will be injected */}
        {children}

        <div style={styles.footer}>
          <span>{footerText} </span>
          <Link to={footerPath} style={styles.link}>
            {footerLinkText}
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
    direction: "rtl",
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
    color: "#2c3e50",
    marginBottom: "0.5rem",
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: "1rem",
    marginBottom: "2rem",
    color: "#666",
    lineHeight: "1.5",
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

export default AuthLayout;
