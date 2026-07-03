export default function Dashboard({ user }) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 60px", width: "100%" }}>
      <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 4 }}>
        Overview
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        {user?.name ? `Welcome, ${user.name}` : "Dashboard"}
      </h1>
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 6 }}>
          Dashboard content is still being defined.
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
          Once the metrics you want are decided (pipeline stages, open cases, offer turnaround, etc.),
          this page will show them here.
        </div>
      </div>
    </div>
  );
}
