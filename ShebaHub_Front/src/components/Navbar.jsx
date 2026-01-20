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
        <div className="profile-dropdown">
          <Link
            to={`/user/${user.id || "me"}`}
            className="navbar-link profile-dropdown-link"
            onClick={closeParentMenu}
          >
            הפרופיל האישי
          </Link>

          <Link
            to="/my-researches"
            className="navbar-link profile-dropdown-link"
            onClick={closeParentMenu}
          >
            המחקרים שלי
          </Link>

          {isMentor && (
            <>
              <Link
                to="/create-research"
                className="navbar-link profile-dropdown-link"
                onClick={closeParentMenu}
              >
                ליצירת מחקר
              </Link>
            </>
          )}

          <Link
            to="/"
            className="navbar-link profile-dropdown-link profile-logout-link"
            onClick={(e) => {
              e.preventDefault();
              logout();
              if (closeParentMenu) closeParentMenu();
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
            to="/"
            className="navbar-link"
            style={{ color: "var(--text-color)" }}
          >
            דף בית
          </Link>

          <Link
            to="/About"
            className="navbar-link"
            style={{ color: "var(--text-color)" }}
          >
            אודותינו
          </Link>

          {user && (
            <>
              <Link
                to="/mentors"
                className="navbar-link"
                style={{ color: "var(--text-color)" }}
              >
                מנחים
              </Link>

              <Link
                to="/apprentices"
                className="navbar-link"
                style={{ color: "var(--text-color)" }}
              >
                מתלמדים
              </Link>

              <Link
                to="/researches"
                className="navbar-link"
                style={{ color: "var(--text-color)" }}
              >
                מחקרים
              </Link>
            </>
          )}
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
  const { user, logout } = useAuth();

  // Single state: 'none', 'profile', or 'menu'
  const [activeMenu, setActiveMenu] = useState('none');
  const [isMentor, setIsMentor] = useState(false);

  const toggleHamburger = () => {
    setActiveMenu((prev) => (prev === 'menu' ? 'none' : 'menu'));
  };

  const toggleProfile = () => {
    setActiveMenu((prev) => (prev === 'profile' ? 'none' : 'profile'));
  };

  const closeAll = () => {
    setActiveMenu('none');
  };

  // Check if user is mentor
  useEffect(() => {
    if (!user) {
      setIsMentor(false);
      return;
    }
    if (typeof user.has_mentor_profile === "boolean") {
      setIsMentor(user.has_mentor_profile);
    }
  }, [user]);

  const isMenuOpen = activeMenu === 'menu';
  const isProfileOpen = activeMenu === 'profile';
  const isAnyOpen = activeMenu !== 'none';

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

        {/* Profile Icon Button */}
        {user && (
          <button
            className="mobile-profile-btn"
            onClick={toggleProfile}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <img
              src={UserProfileIcon}
              alt="User Profile"
              className="navbar-profile-icon"
              style={{
                width: "35px",
                height: "35px",
                objectFit: "contain",
                borderRadius: "50%",
              }}
            />
          </button>
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

      {/* Single Dropdown Container - switches content based on activeMenu */}
      <div
        className={`mobile-dropdown ${isAnyOpen ? "active" : ""}`}
        style={{ backgroundColor: "var(--bg-color)" }}
      >
        {/* Profile Links */}
        {isProfileOpen && user && (
          <>
            <Link
              to={`/user/${user.id || "me"}`}
              className="navbar-link"
              onClick={closeAll}
              style={{ color: "var(--text-color)" }}
            >
              הפרופיל האישי
            </Link>

            <Link
              to="/my-researches"
              className="navbar-link"
              onClick={closeAll}
              style={{ color: "var(--text-color)" }}
            >
              המחקרים שלי
            </Link>

            {isMentor && (
              <Link
                to="/create-research"
                className="navbar-link"
                onClick={closeAll}
                style={{ color: "var(--text-color)" }}
              >
                ליצירת מחקר
              </Link>
            )}

            <Link
              to="/"
              className="navbar-link profile-logout-link"
              onClick={(e) => {
                e.preventDefault();
                logout();
                closeAll();
              }}
            >
              התנתקות
            </Link>
          </>
        )}

        {/* Navigation Links */}
        {isMenuOpen && (
          <>
            <Link
              to="/"
              className="navbar-link"
              onClick={closeAll}
              style={{ color: "var(--text-color)" }}
            >
              דף בית
            </Link>

            <Link
              to="/About"
              className="navbar-link"
              onClick={closeAll}
              style={{ color: "var(--text-color)" }}
            >
              אודותינו
            </Link>

            {user && (
              <>
                <Link
                  to="/mentors"
                  className="navbar-link"
                  onClick={closeAll}
                  style={{ color: "var(--text-color)" }}
                >
                  מנחים
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
                  to="/researches"
                  className="navbar-link"
                  onClick={closeAll}
                  style={{ color: "var(--text-color)" }}
                >
                  מחקרים
                </Link>
              </>
            )}

            {!user && (
              <>
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
              </>
            )}
          </>
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
