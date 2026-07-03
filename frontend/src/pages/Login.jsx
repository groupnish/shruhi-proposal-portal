import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import logo from "../assets/logo.png";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
      onLogin(user);
      navigate("/cases");
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Can't reach the server. Check your connection and try again." : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", padding: 20,
    }}>
      <div className="card" style={{ width: 380, padding: "36px 32px" }}>
        <img src={logo} alt="Shruhi Instrumentation" style={{ height: 56, marginBottom: 18 }} />
        <h1 style={{ fontSize: 21, marginBottom: 4 }}>Shruhi Proposal Portal</h1>
        <p style={{ color: "var(--text-faint)", fontSize: 12.5, margin: "0 0 26px", letterSpacing: 0.3, textTransform: "uppercase" }}>
          Siemens Process Instrumentation — South Gujarat
        </p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label className="fl">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="fl">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <div style={{ background: "var(--red-ink)", border: "1px solid #fecaca", color: "var(--red)", fontSize: 12.5, padding: "9px 11px", borderRadius: 8, marginBottom: 16 }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", padding: "11px 0" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
