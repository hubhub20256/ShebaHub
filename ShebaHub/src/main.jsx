import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import Research from "./pages/Research.jsx";
import Profile from "./pages/Profile.jsx";

import Layout from "./components/Layout.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          {/* These routes use parameters (e.g., /user/1) */}
          <Route path="/user/:id" element={<Profile />} />
          <Route path="/research/:id" element={<Research />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
