import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

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
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(circle at 30% 20%, #142230 0%, var(--ink) 60%)",
      padding: 20,
    }}>
      <div className="card" style={{ width: 380, padding: "36px 32px" }}>
        <svg width="34" height="34" viewBox="0 0 40 40" style={{ marginBottom: 18 }} aria-hidden="true">
          <defs>
            <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4aa3c7" /><stop offset="1" stopColor="#0d4d6b" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="19" fill="url(#lg2)" />
          <path d="M13 11h11a4 4 0 0 1 0 8H17l11 10H17a4 4 0 0 1 0-8h7L13 11z" fill="#fff" />
        </svg>
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
            <div style={{ background: "#2a1414", border: "1px solid #4a2020", color: "var(--red)", fontSize: 12.5, padding: "9px 11px", borderRadius: 8, marginBottom: 16 }}>
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
