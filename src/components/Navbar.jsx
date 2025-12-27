import { Link } from "react-router-dom";
import "../index.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav style={styles.nav}>
      <div style={styles.logoContainer}>
        <Link to="/">
          <img
            src={ShebaNavbarLogo}
            alt="ShebaHub Logo"
            style={styles.logoImage}
          />
        </Link>
      </div>
      <div style={styles.links}>
        <Link to="/create-profile" style={styles.link}>
          יצירת פרופיל מנחה
        </Link>
        <Link to="/researches" style={styles.link}>
          מחקרים
        </Link>
        <Link to="/apprentices" style={styles.link}>
          מתמחים
        </Link>
        <Link to="/mentors" style={styles.link}>
          מנחים
        </Link>
        <Link to="/search" style={styles.link}>
          חיפוש
        </Link>
        <Link to="/About" style={styles.link}>
          אודותינו
        </Link>
        <Link to="/" style={styles.link}>
          דף בית
        </Link>
        
      </div>

      {/* This section now works because 'user' is defined above */}
      <div style={styles.links}>
        {user ? (
          // IF LOGGED IN: Show Profile & Logout
          <>
            <Link to={`/user/${user.id || "me"}`} style={styles.link}>
              פרופיל אישי
            </Link>
            <Link to="/" onClick={logout} style={styles.link}>
              התנתקות
            </Link>
          </>
        ) : (
          // IF LOGGED OUT: Show Login/Register
          <>
            <Link to="/login" style={styles.link}>
              התחברות
            </Link>
            <Link to="/register" style={styles.link}>
              הרשמה
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "1rem 2rem",
    backgroundColor: "#f8f9fa",
    borderBottom: "1px solid #ddd",
    alignItems: "center",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
  },
  logoImage: {
    height: "50px",
    width: "auto",
    objectFit: "contain",
  },
  links: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  link: {
    textDecoration: "none",
    color: "#333",
    fontWeight: "500",
  },
};

export default Navbar;
