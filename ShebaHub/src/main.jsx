import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";

import './index.css'
import App from './App.jsx'

import Home from "./pages/Home.jsx";
import Search from "./pages/Search.jsx";
import Research from "./pages/Research.jsx";
import Profile from "./pages/Profile.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

ReactDOM.createRoot(document.getElementById('root')).render(
  /* pages set up */
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/user/:id" element={<Profile />} />
      <Route path="/research/:id" element={<Research />} />
    </Routes>
  </BrowserRouter>
)