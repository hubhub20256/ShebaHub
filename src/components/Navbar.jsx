import { useState } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "../styles/Navbar.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";

/**
 * ===================================================================================
 * 🚀 NAVBAR COMPONENT DOCUMENTATION
 * ===================================================================================
 * 
 * HOW IT WORKS (BEGINNER'S GUIDE):
 * 
 * 1. STATE MANAGEMENT (useState):
 *    - We need to remember if the menu is OPEN or CLOSED.
 *    - 'isMenuOpen' is our memory variable.
 *    - 'toggleMenu' flips it (Open -> Close / Close -> Open).
 *    - 'closeMenu' forces it to Close (useful when a link is clicked).
 * 
 * 2. CONDITIONAL RENDERING (The ? : User Check):
 *    - Inside the JSX, we check '{user ? ... : ...}'.
 *    - IF 'user' exists (Loggeed In) -> Show "Profile" and "Logout".
 *    - IF 'user' is null (Logged Out) -> Show "Login" and "Register".
 * 
 * 3. DYNAMIC CLASSES (CSS Connections):
 *    - When 'isMenuOpen' is true, we add the class "active" to the links container.
 *    - In Navbar.css, ".navbar-links.active" has rules to show the menu!
 *    - We also add "open" to the hamburger button to animate it into an 'X'.
 * 
 * ===================================================================================
 */

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      {/* 1. Logo Section */}
      <div className="navbar-logo-container">
        <Link to="/" onClick={closeMenu}>
          <img
            src={ShebaNavbarLogo}
            alt="ShebaHub Logo"
            className="navbar-logo-image"
          />
        </Link>
      </div>

      {/* 2. Hamburger Button (Mobile Only) */}
      <button 
        className={`hamburger-menu ${isMenuOpen ? "open" : ""}`} 
        onClick={toggleMenu}
        aria-label="Toggle navigation"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* 3. Navigation Links Container */}
      <div className={`navbar-links ${isMenuOpen ? "active" : ""}`}>
        
        {/* Main Navigation Group */}
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

        {/* Auth Navigation Group */}
        <div className="navbar-group">
          {user ? (
            /* Logged In State */
            <>
              <Link to={`/user/${user.id || "me"}`} className="navbar-link" onClick={closeMenu}>
                פרופיל אישי
              </Link>
              <Link
                to="/"
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="navbar-link"
              >
                התנתקות
              </Link>
            </>
          ) : (
            /* Logged Out State */
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
