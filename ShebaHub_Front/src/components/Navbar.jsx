import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "../styles/Navbar.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";
import UserProfileIcon from "../assets/user_profile.png";
import useMediaQuery from "../hooks/useMediaQuery";
import { FaSun, FaMoon } from "react-icons/fa"; // אייקונים ליום ולילה

// ==========================================
// 0. THEME TOGGLE COMPONENT (NEW)
// ==========================================
const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    // עדכון ה-HTML והזיכרון המקומי בכל פעם שהמשתנה משתנה
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: "1.2rem",
        color: "var(--text-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: "10px", // רווח קטן מהאלמנטים האחרים
      }}
      title="שינוי מצב תצוגה"
    >
      {theme === "light" ? <FaMoon /> : <FaSun style={{ color: "orange" }} />}
    </button>
  );
};

// ==========================================
// 1. REUSABLE PROFILE COMPONENT
// ==========================================
const ProfileMenu = ({ closeParentMenu, onOpen, isOpen }) => {
  const { user, logout } = useAuth();
  const [isMentor, setIsMentor] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const showMenu = isControlled ? isOpen : localIsOpen;

  const menuRef = useRef(null);

  const toggleOpen = (e) => {
    e.preventDefault();
    if (isControlled) {
      onOpen(!showMenu);
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        if (isControlled) onOpen(false);
        else setLocalIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isControlled, onOpen]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user) {
        if (!cancelled) setIsMentor(false);
        return;
      }
      if (typeof user.has_mentor_profile === "boolean") {
        if (!cancelled) setIsMentor(user.has_mentor_profile);
        return;
      }
      if (!cancelled) setIsMentor(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div
      className="navbar-profile"
      ref={menuRef}
      style={{ position: "relative" }}
    >
      <Link
        to="#"
        className="navbar-link navbar-profile-icon"
        onClick={toggleOpen}
      >
        <img
          src={UserProfileIcon}
          alt="User Profile"
          style={{
            width: "35px",
            height: "35px",
            objectFit: "contain",
            borderRadius: "50%",
          }}
        />
      </Link>

      {showMenu && (
        <div
          className="profile-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 15px)",
            right: -10,
            minWidth: "220px",
            background: "var(--card-bg)", // שימוש במשתנה החדש
            border: "1px solid var(--border-color)", // שימוש במשתנה החדש
            borderRadius: "12px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
            zIndex: 9999,
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
            padding: "10px 0",
            overflow: "hidden",
          }}
        >
          <Link
            to={`/user/${user.id || "me"}`}
            className="navbar-link"
            onClick={closeParentMenu}
            style={{
              padding: "10px 20px",
              display: "block",
              color: "var(--text-color)",
            }}
          >
            הפרופיל האישי
          </Link>

          <Link
            to="/my-researches"
            className="navbar-link"
            onClick={closeParentMenu}
            style={{
              padding: "10px 20px",
              display: "block",
              color: "var(--text-color)",
            }}
          >
            המחקרים שלי
          </Link>

          {isMentor && (
            <>
              <Link
                to="/create-research"
                className="navbar-link"
                onClick={closeParentMenu}
                style={{
                  padding: "10px 20px",
                  display: "block",
                  color: "var(--text-color)",
                }}
              >
                ליצירת מחקר
              </Link>
            </>
          )}

          <Link
            to="/"
            className="navbar-link"
            onClick={(e) => {
              e.preventDefault();
              logout();
              if (closeParentMenu) closeParentMenu();
            }}
            style={{
              color: "red",
              padding: "10px 20px",
              display: "block",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            התנתקות
          </Link>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. DESKTOP VIEW
// ==========================================
const DesktopNavbar = () => {
  const { user } = useAuth();

  return (
    <nav
      className="navbar desktop-view"
      style={{
        backgroundColor: "var(--bg-color)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div className="navbar-logo-container">
        <Link to="/">
          <img src={ShebaNavbarLogo} alt="Logo" className="navbar-logo-image" />
        </Link>
      </div>

      <div className="navbar-links">
        {/* ThemeToggle moved to right group */}

        <div className="navbar-group">
          <Link
            to="/researches"
            className="navbar-link"
            style={{ color: "var(--text-color)" }}
          >
            מחקרים
          </Link>
          <Link
            to="/apprentices"
            className="navbar-link"
            style={{ color: "var(--text-color)" }}
          >
            מתלמדים
          </Link>
          <Link
            to="/mentors"
            className="navbar-link"
            style={{ color: "var(--text-color)" }}
          >
            מנחים
          </Link>
          <Link
            to="/About"
            className="navbar-link"
            style={{ color: "var(--text-color)" }}
          >
            אודותינו
          </Link>
          <Link
            to="/"
            className="navbar-link"
            style={{ color: "var(--text-color)" }}
          >
            דף בית
          </Link>
        </div>

        <div className="navbar-group">
          {/* כפתור מצב לילה - הועבר לכאן כדי לא לשבור את המרכוז */}
          <ThemeToggle />

          {user ? (
            <ProfileMenu />
          ) : (
            <>
              <Link
                to="/login"
                className="navbar-link"
                style={{ color: "var(--text-color)" }}
              >
                התחברות
              </Link>
              <Link
                to="/register"
                className="navbar-link"
                style={{ color: "var(--text-color)" }}
              >
                הרשמה
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// ==========================================
// 3. MOBILE VIEW
// ==========================================
const MobileNavbar = () => {
  const { user } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleHamburger = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) setIsProfileOpen(false);
  };

  const toggleProfile = (newState) => {
    setIsProfileOpen(newState);
    if (newState) setIsMenuOpen(false);
  };

  const closeAll = () => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  return (
    <nav
      className="navbar mobile-view"
      style={{
        backgroundColor: "var(--bg-color)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div className="navbar-logo-container">
        <Link to="/" onClick={closeAll}>
          <img src={ShebaNavbarLogo} alt="Logo" className="navbar-logo-image" />
        </Link>
      </div>

      <div className="mobile-actions">
        {/* כפתור מצב לילה למובייל */}
        <ThemeToggle />

        {user && (
          <ProfileMenu
            isOpen={isProfileOpen}
            onOpen={toggleProfile}
            closeParentMenu={closeAll}
          />
        )}

        <button
          className={`hamburger-menu ${isMenuOpen ? "open" : ""}`}
          onClick={toggleHamburger}
          style={{ color: "var(--text-color)" }}
        >
          <span
            className="hamburger-line"
            style={{ backgroundColor: "var(--text-color)" }}
          ></span>
          <span
            className="hamburger-line"
            style={{ backgroundColor: "var(--text-color)" }}
          ></span>
          <span
            className="hamburger-line"
            style={{ backgroundColor: "var(--text-color)" }}
          ></span>
        </button>
      </div>

      <div
        className={`navbar-links ${isMenuOpen ? "active" : ""}`}
        style={{ backgroundColor: "var(--bg-color)" }}
      >
        <div className="navbar-group">
          <Link
            to="/researches"
            className="navbar-link"
            onClick={closeAll}
            style={{ color: "var(--text-color)" }}
          >
            מחקרים
          </Link>
          <Link
            to="/apprentices"
            className="navbar-link"
            onClick={closeAll}
            style={{ color: "var(--text-color)" }}
          >
            מתלמדים
          </Link>
          <Link
            to="/mentors"
            className="navbar-link"
            onClick={closeAll}
            style={{ color: "var(--text-color)" }}
          >
            מנחים
          </Link>
          <Link
            to="/About"
            className="navbar-link"
            onClick={closeAll}
            style={{ color: "var(--text-color)" }}
          >
            אודותינו
          </Link>
          <Link
            to="/"
            className="navbar-link"
            onClick={closeAll}
            style={{ color: "var(--text-color)" }}
          >
            דף בית
          </Link>
        </div>

        {!user && (
          <div
            className="navbar-group"
            style={{
              borderTop: "1px solid var(--border-color)",
              width: "100%",
              padding: "10px 0",
            }}
          >
            <Link
              to="/login"
              className="navbar-link"
              onClick={closeAll}
              style={{ color: "var(--text-color)" }}
            >
              התחברות
            </Link>
            <Link
              to="/register"
              className="navbar-link"
              onClick={closeAll}
              style={{ color: "var(--text-color)" }}
            >
              הרשמה
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

// ==========================================
// 4. MAIN CONTROLLER
// ==========================================
const Navbar = () => {
  const isDesktop = useMediaQuery("(min-width: 769px)");
  return isDesktop ? <DesktopNavbar /> : <MobileNavbar />;
};

export default Navbar;
