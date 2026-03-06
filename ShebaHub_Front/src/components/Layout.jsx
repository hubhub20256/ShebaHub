import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import AnnouncementBanner from "./AnnouncementBanner";

const Layout = () => {
  const location = useLocation();
  const isAuthRoute = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      {!isAuthRoute && <AnnouncementBanner />}
      <main
        style={
          isAuthRoute
            ? { padding: 0, flex: 1, display: "flex" }
            : { padding: "2rem", flex: 1 }
        }
      >
        {/* The Outlet renders the child route's element (e.g., Home, Search) */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
