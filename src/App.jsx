import React from "react";
import { Routes, Route } from "react-router-dom";

// We move the page imports here because this is where they are used
import {
  Home,
  Search,
  Research,
  Profile,
  About,
  Mentors,
  Researches,
  Apprentices,
} from "./pages";

import Layout from "./components/Layout.jsx";

function App() {
  return (
    <Routes>
      {/* The Layout wraps all child routes */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        {/* Dynamic Routes */}
        <Route path="/user/:id" element={<Profile />} />
        <Route path="/research/:id" element={<Research />} />

        {/* Static Content Pages */}
        <Route path="/about" element={<About />} />
        <Route path="/apprentices" element={<Apprentices />} />
        <Route path="/mentors" element={<Mentors />} />
        <Route path="/researches" element={<Researches />} />
      </Route>
    </Routes>
  );
}

export default App;
