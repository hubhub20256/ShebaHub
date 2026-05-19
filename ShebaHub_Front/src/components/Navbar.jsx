import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../index.css";
import "../styles/Navbar.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";
import UserProfileIcon from "../assets/user_profile.png";
import useMediaQuery from "../hooks/useMediaQuery";
import { FaSun, FaMoon, FaBell } from "react-icons/fa";
import { useNotifications } from "../context/NotificationContext";

// ==========================================

// ==========================================
// 0b. NOTIFICATION BELL COMPONENT
// ==========================================
const NotificationBell = () => {
  const { unreadCount, clearCount } = useNotifications();
  const navigate = useNavigate();

  const handleClick = () => {
    clearCount();
    navigate("/notifications");
  };

  return (
    <button
      onClick={handleClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: "1.2rem",
        color: "var(--text-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: "10px",
        position: "relative",
      }}
      title="הודעות"
      aria-label={`הודעות${unreadCount > 0 ? `, ${unreadCount} הודעות חדשות` : ""}`}
    >
      <FaBell />
      {unreadCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: "-4px",
            right: "-4px",
            background: "#e53e3e",
            color: "white",
            borderRadius: "50%",
            width: "18px",
            height: "18px",
            fontSize: "0.7rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

// ==========================================
// 0c. VERIFICATION BANNER COMPONENT
// ==========================================
const RESEND_COOLDOWN_KEY = "resendVerificationCooldownUntil";
const RESEND_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

const VerificationBanner = () => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(() => {
    const until = Number(localStorage.getItem(RESEND_COOLDOWN_KEY) || 0);
    return Math.max(0, until - Date.now());
  });

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setInterval(() => {
      const until = Number(localStorage.getItem(RESEND_COOLDOWN_KEY) || 0);
      const remaining = Math.max(0, until - Date.now());
      setCooldownLeft(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownLeft]);

  if (!user || user.email_verified || !user.require_email_verification)
    return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const { authAPI } = await import("../services/api");
      await authAPI.resendVerification();
      const until = Date.now() + RESEND_COOLDOWN_MS;
      localStorage.setItem(RESEND_COOLDOWN_KEY, String(until));
      setCooldownLeft(RESEND_COOLDOWN_MS);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const cooldownMinutes = Math.ceil(cooldownLeft / 60000);
  const isCoolingDown = cooldownLeft > 0;

  return (
    <div
      dir="rtl"
      style={{
        background: "#fff3cd",
        color: "#856404",
        textAlign: "center",
        padding: "10px 16px",
        fontSize: "0.85rem",
        borderBottom: "1px solid #ffc107",
        zIndex: 999,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      האימייל שלך לא אומת. בדוק/י את תיבת הדואר.{" "}
      {isCoolingDown ? (
        <span style={{ fontWeight: 700 }}>
          נשלח! ניתן לשלוח שוב בעוד {cooldownMinutes} דקות
        </span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          style={{
            background: "none",
            border: "none",
            color: "#856404",
            textDecoration: "underline",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}
        >
          {sending ? "שולח..." : "שלח שוב"}
        </button>
      )}
    </div>
  );
};

// ==========================================
// 1. REUSABLE PROFILE COMPONENT
// ==========================================
const ProfileMenu = ({ closeParentMenu, onOpen, isOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMentor, setIsMentor] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const showMenu = isControlled ? isOpen : localIsOpen;

  const menuRef = useRef(null);

  // Close dropdown on route change
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isControlled) onOpen(false);
    else setLocalIsOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [location.pathname, isControlled, onOpen]);

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

  // Close dropdown on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (isControlled) onOpen(false);
        else setLocalIsOpen(false);
      }
    };
    if (showMenu) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [showMenu, isControlled, onOpen]);

  // Flip dropdown if it overflows the viewport edges
  useEffect(() => {
    if (showMenu && menuRef.current) {
      const dropdown = menuRef.current.querySelector(".profile-dropdown");
      if (dropdown) {
        // Reset styles before measuring
        dropdown.style.right = "";
        dropdown.style.left = "";
        const rect = dropdown.getBoundingClientRect();
        // Fix left overflow (common in RTL when icon is near left edge)
        if (rect.left < 0) {
          dropdown.style.right = "auto";
          dropdown.style.left = "0";
        }
        // Fix right overflow
        if (rect.right > window.innerWidth) {
          dropdown.style.left = "auto";
          dropdown.style.right = "0";
        }
      }
    }
  }, [showMenu]);

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

          <Link
            to="/saved-items"
            className="navbar-link profile-dropdown-link"
            onClick={closeParentMenu}
          >
            השמורים שלי
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
            to="/tasks"
            className="navbar-link profile-dropdown-link"
            onClick={closeParentMenu}
          >
            ניהול משימות
          </Link>

          <Link
            to="/settings"
            className="navbar-link profile-dropdown-link"
            onClick={closeParentMenu}
          >
            הגדרות חשבון
          </Link>

          <Link
            to="/"
            className="navbar-link profile-dropdown-link profile-logout-link"
            onClick={(e) => {
              e.preventDefault();
              logout();
              if (closeParentMenu) closeParentMenu();
              navigate("/");
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
    <>
      <nav
        className="navbar desktop-view"
        style={{
          backgroundColor: "var(--bg-color)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div className="navbar-logo-container">
          <Link to="/">
            <img
              src={ShebaNavbarLogo}
              alt="Logo"
              className="navbar-logo-image"
            />
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

            <Link
              to="/about"
              className="navbar-link"
              style={{ color: "var(--text-color)" }}
            >
              אודותינו
            </Link>

            {user?.is_staff && (
              <Link
                to="/admin"
                className="navbar-link"
                style={{ color: "var(--text-color)" }}
              >
                ניהול
              </Link>
            )}
          </div>

          <div className="navbar-group">
            {/* כפתור מצב לילה הוסר לכאן */}

            {user ? (
              <>
                <NotificationBell />
                <ProfileMenu />
              </>
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
                  className="navbar-cta"
                  style={{
                    background: "#1b2a4a",
                    color: "white",
                    padding: "6px 18px",
                    borderRadius: "20px",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    transition: "opacity 0.2s",
                  }}
                >
                  הרשמה
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <VerificationBanner />
    </>
  );
};

// ==========================================
// 3. MOBILE VIEW
// ==========================================
const MobileNavbar = () => {
  const { user, logout } = useAuth();

  // Single state: 'none', 'profile', or 'menu'
  const [activeMenu, setActiveMenu] = useState("none");
  const [isMentor, setIsMentor] = useState(false);

  const toggleHamburger = () => {
    setActiveMenu((prev) => (prev === "menu" ? "none" : "menu"));
  };

  const toggleProfile = () => {
    setActiveMenu((prev) => (prev === "profile" ? "none" : "profile"));
  };

  const closeAll = () => {
    setActiveMenu("none");
  };

  // Check if user is mentor
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!user) {
      setIsMentor(false);
      return;
    }
    if (typeof user.has_mentor_profile === "boolean") {
      setIsMentor(user.has_mentor_profile);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [user]);

  const isMenuOpen = activeMenu === "menu";
  const isProfileOpen = activeMenu === "profile";
  const isAnyOpen = activeMenu !== "none";

  return (
    <>
      <nav
        className="navbar mobile-view"
        style={{
          backgroundColor: "var(--bg-color)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div className="navbar-logo-container">
          <Link to="/" onClick={closeAll}>
            <img
              src={ShebaNavbarLogo}
              alt="Logo"
              className="navbar-logo-image"
            />
          </Link>
        </div>

        <div className="mobile-actions">
          {/* כפתור מצב לילה הוסר */}

          {/* Bell icon for notifications */}
          {user && <NotificationBell />}

          {/* Profile Icon Button */}
          {user && (
            <button
              className="mobile-profile-btn"
              onClick={toggleProfile}
              aria-label="תפריט פרופיל"
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
                  width: "30px",
                  height: "30px",
                  objectFit: "contain",
                  borderRadius: "50%",
                }}
              />
            </button>
          )}

          <button
            className={`hamburger-menu ${isMenuOpen ? "open" : ""}`}
            onClick={toggleHamburger}
            aria-label={isMenuOpen ? "סגור תפריט" : "פתח תפריט"}
            aria-expanded={isMenuOpen}
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

              <Link
                to="/saved-items"
                className="navbar-link"
                onClick={closeAll}
                style={{ color: "var(--text-color)" }}
              >
                השמורים שלי
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
                to="/tasks"
                className="navbar-link"
                onClick={closeAll}
                style={{ color: "var(--text-color)" }}
              >
                ניהול משימות
              </Link>
              <Link
                to="/settings"
                className="navbar-link"
                onClick={closeAll}
                style={{ color: "var(--text-color)" }}
              >
                הגדרות חשבון
              </Link>

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

              <Link
                to="/about"
                className="navbar-link"
                onClick={closeAll}
                style={{ color: "var(--text-color)" }}
              >
                אודותינו
              </Link>

              {user?.is_staff && (
                <Link
                  to="/admin"
                  className="navbar-link"
                  onClick={closeAll}
                  style={{ color: "var(--text-color)" }}
                >
                  ניהול
                </Link>
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
                    className="navbar-cta"
                    onClick={closeAll}
                    style={{
                      background: "#1b2a4a",
                      color: "white",
                      padding: "8px 20px",
                      borderRadius: "20px",
                      fontWeight: 700,
                      textDecoration: "none",
                      textAlign: "center",
                      display: "inline-block",
                      marginTop: "4px",
                    }}
                  >
                    הרשמה
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>
      <VerificationBanner />
    </>
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
