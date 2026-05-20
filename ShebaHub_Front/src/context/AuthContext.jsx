import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize user from localStorage if available
  const [user, setUser] = useState(() => {
    // Only treat as logged-in if we have a valid (non-expired) access token
    // If there's a stale token/user, clear it to avoid "phantom login" UI.
    const hasToken = !!localStorage.getItem('accessToken');
    if (hasToken && !authAPI.isAuthenticated()) {
      authAPI.logout();
      return null;
    }
    if (!authAPI.isAuthenticated()) return null;
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Refresh user data from the server (syncs email_verified, profiles, etc.)
  const refreshUser = async () => {
    if (!authAPI.isAuthenticated()) return;
    try {
      const freshUser = await authAPI.fetchMe();
      setUser(freshUser);
      localStorage.setItem('user', JSON.stringify(freshUser));
    } catch {
      // If the token is invalid the interceptor will clear it
    }
  };

  // Check authentication status on mount and sync with server
  useEffect(() => {
    const checkAuth = async () => {
      if (authAPI.isAuthenticated()) {
        const savedUser = authAPI.getCurrentUser();
        setUser(savedUser);
        // Fetch fresh data from server to sync email_verified etc.
        try {
          const freshUser = await authAPI.fetchMe();
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch {
          // Keep using cached user if fetch fails
        }
      } else {
        // Ensure localStorage is clean so navbar shows login/register.
        if (localStorage.getItem('accessToken') || localStorage.getItem('user')) {
          authAPI.logout();
        }
        setUser(null);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // If something clears tokens (e.g., refresh failure in api.js), sync context
  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  // Login function - accepts user data after successful API call
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  // Update user data (e.g., after profile creation)
  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Check if user has a specific profile type
  const hasProfile = (type) => {
    if (!user) return false;
    if (type === 'mentor') return user.has_mentor_profile;
    if (type === 'student') return user.has_student_profile;
    return false;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
    hasProfile,
    isAuthenticated: !!user,
    isAdmin: !!user?.is_staff,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
