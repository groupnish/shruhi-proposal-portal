export default function TopBar({ user, onLogout }) {
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "0 24px", height: 58,
      borderBottom: "1px solid var(--line)",
      background: "var(--panel)",
    }}>
      <svg width="26" height="26" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4aa3c7" />
            <stop offset="1" stopColor="#0d4d6b" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="19" fill="url(#lg)" />
        <path d="M13 11h11a4 4 0 0 1 0 8H17l11 10H17a4 4 0 0 1 0-8h7L13 11z" fill="#fff" />
      </svg>
      <div>
        <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 15, lineHeight: 1.1 }}>
          Shruhi Proposal Portal
        </div>
        <div style={{ fontSize: 10.5, letterSpacing: 0.5, color: "var(--text-faint)", textTransform: "uppercase" }}>
          Siemens Process Instrumentation
        </div>
      </div>
      {user && (
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "capitalize" }}>
              {(user.role || "").replace("_", " ")}
            </div>
          </div>
          <button className="btn-ghost" onClick={onLogout} style={{ padding: "7px 12px", fontSize: 12 }}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
