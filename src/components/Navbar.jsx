import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "../styles/Navbar.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";
import UserProfileIcon from "../assets/user_profile.png"

const Navbar = () => {
  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    setIsProfileMenuOpen(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsProfileMenuOpen(false);
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-logo-container">
        <Link to="/" onClick={closeMenu}>
          <img
            src={ShebaNavbarLogo}
            alt="ShebaHub Logo"
            className="navbar-logo-image"
          />
        </Link>
      </div>

      <button
        className={`hamburger-menu ${isMenuOpen ? "open" : ""}`}
        onClick={toggleMenu}
        aria-label="Toggle navigation"
        aria-expanded={isMenuOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <div className={`navbar-links ${isMenuOpen ? "active" : ""}`}>
        <div className="navbar-group">
          <Link to="/researches" className="navbar-link" onClick={closeMenu}>
            מחקרים
          </Link>
          <Link to="/apprentices" className="navbar-link" onClick={closeMenu}>
            מתלמדים
          </Link>
          <Link to="/mentors" className="navbar-link" onClick={closeMenu}>
            מנחים
          </Link>
          <Link to="/About" className="navbar-link" onClick={closeMenu}>
            אודותינו
          </Link>
          <Link to="/" className="navbar-link" onClick={closeMenu}>
            דף בית
          </Link>
        </div>

        <div className="navbar-group">
          {user ? (
            <div
              className="navbar-profile"
              ref={profileMenuRef}
              style={{ position: "relative" }}
            >
             <Link
              to="#"
              className="navbar-link navbar-profile-icon"
              onClick={(e) => {
                e.preventDefault();
                toggleProfileMenu();
              }}
              aria-label="תפריט פרופיל"
            >
              <img
                src={UserProfileIcon}
                alt="פרופיל משתמש"
                style={{
                  width: "30px",
                  height: "30px",
                  objectFit: "contain",
                  display: "block"
                }}
              />

            </Link>


              {isProfileMenuOpen && (
                <div
                  className="profile-dropdown"
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    minWidth: "220px",
                    background: "#fff",
                    border: "1px solid #E6E8F0",
                    borderRadius: "12px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                    zIndex: 9999,
                    textAlign: "right",
                  }}
                >
                  <Link
                    to={`/user/${user.id || "me"}`}
                    className="navbar-link"
                    onClick={closeMenu}
                    role="menuitem"
                    style={{
                      display: "block",
                      padding: "14px 16px",
                      borderBottom: "1px solid #F0F2F6",
                    }}
                  >
                    הפרופיל האישי
                  </Link>

                  <Link
                     to="/research/1"
                    className="navbar-link"
                    onClick={closeMenu}
                    role="menuitem"
                    style={{
                      display: "block",
                      padding: "14px 16px",
                      borderBottom: "1px solid #F0F2F6",
                    }}
                  >
                    המחקרים שלי
                  </Link>

                  <Link
                    to="/my-apprentices"
                    className="navbar-link"
                    onClick={closeMenu}
                    role="menuitem"
                    style={{
                      display: "block",
                      padding: "14px 16px",
                      borderBottom: "1px solid #F0F2F6",
                    }}
                  >
                    המתמחים שלי
                  </Link>

                  {/* תיקון הקישור: שם קובץ CreateResearch.jsx לא קובע את הנתיב,
                      הנתיב נקבע ב-Router. לרוב הנתיב יהיה /create-research או /createResearch.
                      כאן שמתי /create-research (הכי סטנדרטי). אם אצלך זה שונה, החליפי. */}
                  <Link
                    to="/create-research"
                    className="navbar-link"
                    onClick={closeMenu}
                    role="menuitem"
                    style={{
                      display: "block",
                      padding: "14px 16px",
                      borderBottom: "1px solid #F0F2F6",
                    }}
                  >
                    ליצירת מחקר
                  </Link>

                  <Link
                    to="/"
                    className="navbar-link"
                    role="menuitem"
                    onClick={(e) => {
                      e.preventDefault();
                      logout();
                      closeMenu();
                    }}
                    style={{
                      display: "block",
                      padding: "14px 16px",
                    }}
                  >
                    התנתקות
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="navbar-link" onClick={closeMenu}>
                התחברות
              </Link>
              <Link to="/register" className="navbar-link" onClick={closeMenu}>
                הרשמה
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
