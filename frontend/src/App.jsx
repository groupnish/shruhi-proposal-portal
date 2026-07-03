import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Cases from "./pages/Cases.jsx";
import TopBar from "./components/TopBar.jsx";

function storedUser() {
  try { return JSON.parse(sessionStorage.getItem("user")); } catch { return null; }
}

export default function App() {
  const [user, setUser] = useState(storedUser());
  const authed = !!sessionStorage.getItem("token");
  const navigate = useNavigate();

  function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  }

  return (
    <>
      {authed && <TopBar user={user} onLogout={logout} />}
      <Routes>
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="/cases" element={authed ? <Cases user={user} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={authed ? "/cases" : "/login"} />} />
      </Routes>
    </>
  );
}
