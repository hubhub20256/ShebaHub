import { useState } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "../styles/Navbar.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";

/**
 * ========================================================
 * 🚀 NAVBAR COMPONENT - EXPLAINED FOR BEGINNERS 🚀
 * ========================================================
 * 
 * This file creates the Navigation Bar using React.
 * It handles the logic, like checking if a user is logged in
 * and opening/closing the mobile menu.
 */
const Navbar = () => {
  // 1. GET USER INFO
  // We use a custom 'hook' to get the current user and the logout function.
  const { user, logout } = useAuth();

  // 2. MANAGE MENU STATE (Open or Closed?)
  // 'useState' remembers memory variables for us.
  // isMenuOpen = false (Closed by default)
  // setIsMenuOpen = A function to change that value.
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Function to FLIP the state (True -> False / False -> True)
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Function to ALWAYS CLOSE the menu (Used when a link is clicked)
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    // The main container with the class 'navbar' (See Navbar.css)
    <nav className="navbar">
      
      {/* 
        SECTION 1: LOGO 
        Clicking the logo takes you home ('/') and closes the menu.
      */}
      <div className="navbar-logo-container">
        <Link to="/" onClick={closeMenu}>
          <img
            src={ShebaNavbarLogo}
            alt="ShebaHub Logo"
            className="navbar-logo-image"
          />
        </Link>
      </div>

      {/* 
        SECTION 2: HAMBURGER BUTTON (Mobile Only)
        When clicked, it runs 'toggleMenu'.
        The class 'open' is added if isMenuOpen is true, triggering the CSS animation.
      */}
      <button 
        className={`hamburger-menu ${isMenuOpen ? "open" : ""}`} 
        onClick={toggleMenu}
        aria-label="Toggle navigation"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* 
        SECTION 3: NAVIGATION LINKS
        This container holds all the text buttons.
        If isMenuOpen is true, we add the 'active' class to show the drawer.
      */}
      <div className={`navbar-links ${isMenuOpen ? "active" : ""}`}>
        
        {/* GROUP A: Middle Links (Researchers, Mentors...) */}
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

        {/* GROUP B: Auth Links (Right Side) */}
        <div className="navbar-group">
          {/* 
            LOGIC CHECK: Is the user logged in? 
            ? = YES, show Profile/Logout
            : = NO, show Login/Register
          */}
          {user ? (
            // YES: User is logged in
            <>
              <Link to={`/user/${user.id || "me"}`} className="navbar-link" onClick={closeMenu}>
                פרופיל אישי
              </Link>
              <Link
                to="/"
                onClick={() => {
                  logout();    // 1. Log them out
                  closeMenu(); // 2. Close the menu
                }}
                className="navbar-link"
              >
                התנתקות
              </Link>
            </>
          ) : (
            // NO: User is NOT logged in
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
