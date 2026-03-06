import React from "react";
import { Link } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";

export default function NotFound() {
  usePageTitle("דף לא נמצא");
  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "4rem", margin: 0, color: "var(--text-color)" }}>404</h1>
      <p style={{ fontSize: "1.25rem", color: "var(--text-color)", marginTop: "0.5rem" }}>
        העמוד שחיפשת לא נמצא
      </p>
      <Link
        to="/"
        style={{
          marginTop: "1.5rem",
          padding: "0.6rem 1.5rem",
          borderRadius: "1.25rem",
          background: "var(--profile-accent-teal, #00bfa5)",
          color: "white",
          textDecoration: "none",
          fontWeight: 600,
        }}
      >
        חזרה לדף הבית
      </Link>
    </div>
  );
}
