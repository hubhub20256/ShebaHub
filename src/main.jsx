import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import Research from "./pages/Research.jsx";
import Profile from "./pages/Profile.jsx";
import About from "./pages/About.jsx";
import Mentors from "./pages/Mentors.jsx";
import Researches from "./pages/Researches.jsx";

import Layout from "./components/Layout.jsx";
import Apprentices from "./pages/Apprentices.jsx";

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
          <Route path="/about" element={<About />} />
          <Route path="/Apprentices" element={<Apprentices />} />
          <Route path="/Mentors" element={<Mentors />} />
          <Route path="/Researches" element={<Researches />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
