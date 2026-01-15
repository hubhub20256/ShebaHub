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
  MyResearches,
  Apprentices,
  Register,
  Login,
  CreateProfile,
  CreateResearch,
} from "./pages";

import RequireMentor from "./components/RequireMentor.jsx";

import Layout from "./components/Layout.jsx";

function App() {
  return (
    <Routes>
      {/* The Layout wraps all child routes */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />

        {/* Dynamic Routes */}
        <Route path="/user/:id" element={<Profile />} />
        <Route path="/research/:id" element={<Research />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Static Content Pages */}
        <Route path="/about" element={<About />} />
        <Route path="/apprentices" element={<Apprentices />} />
        <Route path="/mentors" element={<Mentors />} />
        <Route path="/researches" element={<Researches />} />
        <Route path="/my-researches" element={<MyResearches />} />
        <Route path="/create-profile" element={<CreateProfile />} />
        <Route
          path="/create-research"
          element={
            <RequireMentor>
              <CreateResearch />
            </RequireMentor>
          }
        />
        <Route
          path="/research/:id/edit"
          element={
            <RequireMentor>
              <CreateResearch />
            </RequireMentor>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
