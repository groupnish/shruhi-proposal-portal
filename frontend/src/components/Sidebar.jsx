import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "\uD83D\uDCCA" },
  { to: "/cases", label: "Cases", icon: "\uD83D\uDCC1" },
  { to: "/customers", label: "Customers", icon: "\uD83D\uDC65" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/users", label: "Users", icon: "\uD83D\uDD10" },
];

export default function Sidebar({ user }) {
  const items = user?.role === "admin" ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;
  return (
    <aside style={{
      width: 220, flexShrink: 0, background: "var(--sidebar)",
      borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column",
      minHeight: "100vh",
    }}>
      <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#2dd4bf" /><stop offset="1" stopColor="#0f766e" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="19" fill="url(#lg)" />
            <path d="M13 11h11a4 4 0 0 1 0 8H17l11 10H17a4 4 0 0 1 0-8h7L13 11z" fill="#fff" />
          </svg>
          <div>
            <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 14, lineHeight: 1.15 }}>
              Shruhi Instrumentation
            </div>
            <div style={{ fontSize: 10, letterSpacing: 0.3, color: "var(--text-faint)" }}>
              Proposal Portal
            </div>
          </div>
        </div>
      </div>

      <nav style={{ padding: "16px 12px", flex: 1 }}>
        <div style={{ fontSize: 10.5, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-faint)", padding: "0 8px 8px", fontWeight: 600 }}>
          Main
        </div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: 7, marginBottom: 2,
              fontSize: 13.5, fontWeight: 500, textDecoration: "none",
              color: isActive ? "var(--green)" : "var(--text-dim)",
              background: isActive ? "var(--green-ink)" : "transparent",
            })}
          >
            <span aria-hidden="true" style={{ fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
