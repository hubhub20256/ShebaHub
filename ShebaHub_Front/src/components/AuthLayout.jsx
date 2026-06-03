import React from "react";
import { Link } from "react-router-dom";
import "../styles/AuthLayout.css";

const AuthLayout = ({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerPath,
}) => {
  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">{title}</h1>
          <div className="auth-underline" />
          {subtitle ? <div className="auth-subtitle">{subtitle}</div> : null}
        </div>

        {children}

        <div className="auth-footer">
          <span>{footerText} </span>
          <Link to={footerPath} className="auth-link">
            {footerLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
