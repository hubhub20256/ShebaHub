import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = () => {
  return (
    <div>
      <Navbar />
      <main style={{ padding: "2rem" }}>
        {/* The Outlet renders the child route's element (e.g., Home, Search) */}
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
