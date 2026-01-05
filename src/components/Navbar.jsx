import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../index.css";
import "../styles/Navbar.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";
import UserProfileIcon from "../assets/user_profile.png";
import useMediaQuery from "../hooks/useMediaQuery";

// ==========================================
// 1. REUSABLE PROFILE COMPONENT
// ==========================================
const ProfileMenu = ({ closeParentMenu, onOpen, isOpen }) => {
  const { user, logout } = useAuth();
  // If 'isOpen' is controlled by parent, use it. Otherwise use local state.
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const showMenu = isControlled ? isOpen : localIsOpen;

  const menuRef = useRef(null);

  const toggleOpen = (e) => {
    e.preventDefault();
    if (isControlled) {
      onOpen(!showMenu); // Tell parent to toggle
    } else {
      setLocalIsOpen(!localIsOpen);
    }
  };

  // Close when clicking outside
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

  return (
    <div className="navbar-profile" ref={menuRef} style={{ position: "relative" }}>
      <Link to="#" className="navbar-link navbar-profile-icon" onClick={toggleOpen}>
        <img
          src={UserProfileIcon}
          alt="User Profile"
          style={{ width: "35px", height: "35px", objectFit: "contain", borderRadius: "50%" }}
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
            background: "#fff",
            border: "1px solid #E6E8F0",
            borderRadius: "12px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
            zIndex: 9999,
            textAlign: "right",
            // --- ADD THESE LINES BELOW ---
            display: "flex",         // Makes the container a flexbox
            flexDirection: "column", // Stacks children vertically
            padding: "10px 0",       // Adds breathing room top/bottom
            overflow: "hidden"       // Keeps corners rounded
            // -----------------------------
          }}
        >
          {/* I removed the extra "dropdown-links-container" div to keep it simple. 
              The Flex styles above will now apply directly to these Links. */}
            
            <Link 
              to={`/user/${user.id || "me"}`} 
              className="navbar-link" 
              onClick={closeParentMenu}
              // Optional: Add padding to links so they are easier to click
              style={{ padding: "10px 20px", display: "block" }} 
            >
              הפרופיל האישי
            </Link>
            
            <Link to="/research/1" className="navbar-link" onClick={closeParentMenu} style={{ padding: "10px 20px", display: "block" }}>
              המחקרים שלי
            </Link>
            <Link to="/my-apprentices" className="navbar-link" onClick={closeParentMenu} style={{ padding: "10px 20px", display: "block" }}>
              המתמחים שלי
            </Link>
            <Link to="/create-research" className="navbar-link" onClick={closeParentMenu} style={{ padding: "10px 20px", display: "block" }}>
              ליצירת מחקר
            </Link>
            
            <Link
              to="/"
              className="navbar-link"
              onClick={(e) => {
                e.preventDefault();
                logout();
                if (closeParentMenu) closeParentMenu();
              }}
              style={{ color: "red", padding: "10px 20px", display: "block", borderTop: "1px solid #eee" }}
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
    <nav className="navbar desktop-view">
      <div className="navbar-logo-container">
        <Link to="/">
          <img src={ShebaNavbarLogo} alt="Logo" className="navbar-logo-image" />
        </Link>
      </div>

      <div className="navbar-links">
        <div className="navbar-group">
          <Link to="/researches" className="navbar-link">מחקרים</Link>
          <Link to="/apprentices" className="navbar-link">מתלמדים</Link>
          <Link to="/mentors" className="navbar-link">מנחים</Link>
          <Link to="/About" className="navbar-link">אודותינו</Link>
          <Link to="/" className="navbar-link">דף בית</Link>
        </div>

        <div className="navbar-group">
          {user ? (
            <ProfileMenu />
          ) : (
            <>
              <Link to="/login" className="navbar-link">התחברות</Link>
              <Link to="/register" className="navbar-link">הרשמה</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// ==========================================
// 3. MOBILE VIEW (UPDATED)
// ==========================================
const MobileNavbar = () => {
  const { user } = useAuth();
  
  // State for the two menus
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Toggle Logic: Opening one closes the other
  const toggleHamburger = () => {
    setIsMenuOpen(!isMenuOpen);
    if (!isMenuOpen) setIsProfileOpen(false); // Close profile if opening menu
  };

  const toggleProfile = (newState) => {
    setIsProfileOpen(newState);
    if (newState) setIsMenuOpen(false); // Close menu if opening profile
  };

  const closeAll = () => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  };

  return (
    <nav className="navbar mobile-view">
      <div className="navbar-logo-container">
        <Link to="/" onClick={closeAll}>
          <img src={ShebaNavbarLogo} alt="Logo" className="navbar-logo-image" />
        </Link>
      </div>

      {/* RIGHT SIDE CONTROLS: Profile + Hamburger */}
      <div className="mobile-actions">
        
        {/* 1. Profile Icon (Only if logged in) */}
        {user && (
          <ProfileMenu 
            isOpen={isProfileOpen} 
            onOpen={toggleProfile} 
            closeParentMenu={closeAll} 
          />
        )}

        {/* 2. Hamburger Icon */}
        <button
          className={`hamburger-menu ${isMenuOpen ? "open" : ""}`}
          onClick={toggleHamburger}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* MAIN SLIDING MENU (Links Only) */}
      <div className={`navbar-links ${isMenuOpen ? "active" : ""}`}>
        <div className="navbar-group">
          <Link to="/researches" className="navbar-link" onClick={closeAll}>מחקרים</Link>
          <Link to="/apprentices" className="navbar-link" onClick={closeAll}>מתלמדים</Link>
          <Link to="/mentors" className="navbar-link" onClick={closeAll}>מנחים</Link>
          <Link to="/About" className="navbar-link" onClick={closeAll}>אודותינו</Link>
          <Link to="/" className="navbar-link" onClick={closeAll}>דף בית</Link>
        </div>

        {/* Login links if NOT logged in (if logged in, profile is in header) */}
        {!user && (
          <div className="navbar-group" style={{ borderTop: "1px solid #eee", width: "100%", padding: "10px 0" }}>
             <Link to="/login" className="navbar-link" onClick={closeAll}>התחברות</Link>
             <Link to="/register" className="navbar-link" onClick={closeAll}>הרשמה</Link>
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