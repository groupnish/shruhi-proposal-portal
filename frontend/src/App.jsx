import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Cases from "./pages/Cases.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const authed = !!sessionStorage.getItem("token");

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={setUser} />} />
      <Route path="/cases" element={authed ? <Cases user={user} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={authed ? "/cases" : "/login"} />} />
    </Routes>
  );
}
