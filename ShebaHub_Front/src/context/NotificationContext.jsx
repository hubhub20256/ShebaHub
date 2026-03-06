import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { messagesAPI } from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = useCallback(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    messagesAPI
      .getUnreadCount()
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => {});
  }, [user]);

  const clearCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Poll every 60s
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      return;
    }
    refreshCount();
    const interval = setInterval(refreshCount, 15000);
    return () => clearInterval(interval);
  }, [user, refreshCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount, clearCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
};
