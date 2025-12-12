import { Link } from "react-router-dom";
import "../index.css";
import ShebaNavbarLogo from "../assets/ShebaNavbarLogo.png";

const Navbar = () => {
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
      <div style={styles.links}>
        {/* We'll use a placeholder ID for now */}
        <Link to="/user/1" style={styles.link}>
          פרופיל
        </Link>
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
    height: "50px", // Set a fixed height to prevent layout shifts
    width: "auto", // Maintain aspect ratio
    objectFit: "contain",
  },
  links: {
    display: "flex",
    gap: "1rem",
  },
  link: {
    textDecoration: "none",
    color: "#333",
  },
};

export default Navbar;
