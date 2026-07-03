import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import CustomerPicker from "../components/CustomerPicker.jsx";

const STAGES = [
  { key: "enquiry", label: "Enquiry", color: "#5d7188" },
  { key: "costing", label: "Costing", color: "#f2a900" },
  { key: "costing_complete", label: "Costing complete", color: "#f2a900" },
  { key: "offer_prepared", label: "Offer prepared", color: "#1bb8b0" },
  { key: "offer_sent", label: "Offer sent", color: "#1bb8b0" },
  { key: "negotiation", label: "Negotiation", color: "#f2a900" },
  { key: "won", label: "Won", color: "#3fb950" },
  { key: "lost", label: "Lost", color: "#ff6b6b" },
];
const stageMeta = (key) => STAGES.find((s) => s.key === key) || STAGES[0];

export default function Cases({ user }) {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [requirement, setRequirement] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setCases(await api.listCases());
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!selectedCustomer) { setError("Select or add a customer first"); return; }
    try {
      await api.createCase({
        customer: { id: selectedCustomer.id },
        requirement_text: requirement,
      });
      setSelectedCustomer(null);
      setRequirement("");
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function moveStage(id, stage) {
    await api.updateStage(id, stage);
    refresh();
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 60px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 4 }}>
            Case register
          </div>
          <h1 style={{ fontSize: 24 }}>Cases</h1>
        </div>
        <button className="btn-primary" onClick={() => {
          setShowForm((s) => !s);
          setSelectedCustomer(null);
          setRequirement("");
          setError("");
        }}>
          {showForm ? "Cancel" : "+ New case"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ padding: 22, marginBottom: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <label className="fl">Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={setSelectedCustomer} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="fl">Requirement</label>
            <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={3} placeholder="What has the customer asked for?" />
          </div>
          {error && <div style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="btn-primary">Create case</button>
        </form>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : !cases.length ? (
          <div className="empty-state">
            No cases yet. Start with <b style={{ color: "var(--text-dim)" }}>+ New case</b> above.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Reference", "Customer", "Stage", "Created", "Move to"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "12px 16px", fontSize: 11,
                    letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => {
                const meta = stageMeta(c.stage);
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    style={{ borderBottom: "1px solid var(--line-soft)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <span className="ref-stamp">CASE-{String(c.id).padStart(4, "0")}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
                      {c.customer_code && <div style={{ fontSize: 11.5, color: "var(--text-faint)" }} className="mono">{c.customer_code}</div>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="stage-pill">
                        <span className="stage-dot" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim)", fontSize: 13 }}>
                      {new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <select defaultValue="" onChange={(e) => e.target.value && moveStage(c.id, e.target.value)} style={{ minWidth: 170 }}>
                        <option value="" disabled>Choose stage…</option>
                        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
