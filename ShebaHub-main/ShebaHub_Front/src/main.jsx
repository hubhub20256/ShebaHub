import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import ErrorBoundary from "./components/ErrorBoundary";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { direction: "rtl", fontFamily: "Rubik, system-ui, sans-serif", background: "var(--card-bg, #fff)", color: "var(--text-color, #333)" },
            }}
          />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>
);
