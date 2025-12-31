import { useState } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "../styles/Navbar.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";

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
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <div className={`navbar-links ${isMenuOpen ? "active" : ""}`}>
        {/* Main Navigation Group */}
        <div className="navbar-group">
          <Link to="/researches" className="navbar-link" onClick={closeMenu}>
            מחקרים
          </Link>
          <Link to="/apprentices" className="navbar-link" onClick={closeMenu}>
            מתמחים
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
            // IF LOGGED IN: Show Profile & Logout
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
            // IF LOGGED OUT: Show Login/Register
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
