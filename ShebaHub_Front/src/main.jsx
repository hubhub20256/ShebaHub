import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App.jsx"; // We now import the App we just defined
import "./index.css";
import favicon from "./assets/tabLogo.png";

// Dynamically set favicon
const link = document.querySelector("link[rel~='icon']");
if (link) {
  link.href = favicon;
} else {
  const newLink = document.createElement('link');
  newLink.rel = 'icon';
  newLink.href = favicon;
  document.head.appendChild(newLink);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>
);
