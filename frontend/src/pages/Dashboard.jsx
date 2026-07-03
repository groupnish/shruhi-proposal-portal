export default function Dashboard({ user }) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 60px", width: "100%" }}>
      <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 4 }}>
        Overview
      </div>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        {user?.name ? `Welcome, ${user.name}` : "Dashboard"}
      </h1>
      <div className="card" style={{ padding: 32, textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 6 }}>
          Dashboard content is still being defined.
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)" }}>
          Once the metrics you want are decided (pipeline stages, open cases, offer turnaround, etc.),
          this page will show them here.
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 12, fontWeight: 600 }}>
          Planned metrics
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7 }}>
          <li>Accuracy of proposal submission — derived from the difference between each case's Schedule Date and Actual Date of proposal.</li>
          <li>On-time performance of users working various cases — derived from the same schedule-vs-actual date data, grouped by who handled each case.</li>
        </ul>
      </div>
    </div>
  );
}
