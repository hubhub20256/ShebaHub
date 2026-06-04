import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireProfile({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.has_student_profile && !user?.has_mentor_profile) {
    return <Navigate to="/create-profile" replace />;
  }
  return children;
}
