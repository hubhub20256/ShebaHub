import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { useAuth } from "./context/AuthContext";

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
  NotFound,
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
  Notifications,
  AdminDashboard,
} from "./pages";

import RequireAuth from "./components/RequireAuth.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";
import RequireMentor from "./components/RequireMentor.jsx";
import RequireProfile from "./components/RequireProfile.jsx";

import Layout from "./components/Layout.jsx";

const RedirectIfAuth = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    // New users without a profile go to create-profile instead of home
    const hasProfile = user?.has_student_profile || user?.has_mentor_profile;
    return <Navigate to={hasProfile ? "/" : "/create-profile"} replace />;
  }
  return children;
};

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
        <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
        <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
        <Route path="/forgot-password" element={<RedirectIfAuth><ForgotPassword /></RedirectIfAuth>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />

        {/* Static Content Pages */}
        <Route path="/about" element={<About />} />
        <Route path="/apprentices" element={<Apprentices />} />
        <Route path="/mentors" element={<Mentors />} />
        <Route path="/researches" element={<Researches />} />
        <Route path="/my-researches" element={<RequireProfile><MyResearches /></RequireProfile>} />
        <Route path="/create-profile" element={<RequireAuth><CreateProfile /></RequireAuth>} />
        <Route
          path="/create-research"
          element={
            <RequireProfile>
              <RequireMentor>
                <CreateResearch />
              </RequireMentor>
            </RequireProfile>
          }
        />
        <Route
          path="/research/:id/edit"
          element={
            <RequireProfile>
              <RequireMentor>
                <CreateResearch />
              </RequireMentor>
            </RequireProfile>
          }
        />

        {/* Admin panel */}
        <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
