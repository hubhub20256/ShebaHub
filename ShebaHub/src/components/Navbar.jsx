import { Link } from "react-router-dom";
import "../index.css";

const Navbar = () => {
  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>ShebaHub</div>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>
          Home
        </Link>
        <Link to="/search" style={styles.link}>
          Search
        </Link>
        {/* We'll use a placeholder ID for now */}
        <Link to="/user/1" style={styles.link}>
          Profile
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
  },
  logo: {
    fontWeight: "bold",
    fontSize: "1.2rem",
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
