import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Cases from "./pages/Cases.jsx";
import CaseDetail from "./pages/CaseDetail.jsx";
import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";

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

  if (!authed) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar user={user} onLogout={logout} title="Case register" />
        <Routes>
          <Route path="/login" element={<Navigate to="/cases" />} />
          <Route path="/cases" element={<Cases user={user} />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="*" element={<Navigate to="/cases" />} />
        </Routes>
      </div>
    </div>
  );
}
