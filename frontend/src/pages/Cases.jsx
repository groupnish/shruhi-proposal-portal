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
const INQUIRY_TYPES = [
  { value: "purchase", label: "Purchase" },
  { value: "budgetary", label: "Budgetary" },
  { value: "tender", label: "Tender" },
];
const stageMeta = (key) => STAGES.find((s) => s.key === key) || STAGES[0];
const defaultRef = (c) => `CASE-${String(c.id).padStart(4, "0")}`;
const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

function ReferenceCell({ c, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(c.reference || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateCaseReference(c.id, value.trim());
      onSaved(updated);
      setEditing(false);
    } catch {
      // leave editing open so the user can retry
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          placeholder={defaultRef(c)}
          className="mono"
          style={{ width: 140, padding: "4px 8px", fontSize: 12 }}
          autoFocus
        />
        <button className="btn-ghost" onClick={save} disabled={saving} style={{ padding: "4px 8px", fontSize: 11 }}>
          {saving ? "…" : "Save"}
        </button>
      </div>
    );
  }

  return (
    <span
      className="ref-stamp"
      style={{ cursor: "pointer" }}
      title="Click to edit"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {c.reference || defaultRef(c)}
    </span>
  );
}

export default function Cases({ user }) {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [requirement, setRequirement] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setCases(await api.listCases());
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  function patchCase(updated) {
    setCases((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!selectedCustomer) { setError("Select or add a customer first"); return; }
    try {
      await api.createCase({
        customer: { id: selectedCustomer.id },
        requirement_text: requirement,
        inquiry_type: inquiryType || null,
        scheduled_offer_date: scheduleDate || null,
      });
      setSelectedCustomer(null);
      setRequirement("");
      setInquiryType("");
      setScheduleDate("");
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

  async function updateInquiryType(id, inquiry_type) {
    const updated = await api.updateCaseDetails(id, { inquiry_type });
    patchCase(updated);
  }

  async function updateScheduleDate(id, scheduled_offer_date) {
    const updated = await api.updateCaseDetails(id, { scheduled_offer_date });
    patchCase(updated);
  }

  return (
    <div style={{ maxWidth: 1420, margin: "0 auto", padding: "36px 24px 60px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--text-faint)", marginBottom: 4 }}>
            Proposal register
          </div>
          <h1 style={{ fontSize: 24 }}>List of Proposal</h1>
        </div>
        <button className="btn-primary" onClick={() => {
          setShowForm((s) => !s);
          setSelectedCustomer(null);
          setRequirement("");
          setInquiryType("");
          setScheduleDate("");
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label className="fl">Type of inquiry</label>
              <select value={inquiryType} onChange={(e) => setInquiryType(e.target.value)}>
                <option value="">Not set</option>
                {INQUIRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Schedule date of proposal</label>
              <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="fl">Requirement</label>
            <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={3} placeholder="What has the customer asked for?" />
          </div>
          {error && <div style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="btn-primary">Create case</button>
        </form>
      )}

      <div className="card" style={{ overflow: "auto" }}>
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
                {["Reference", "Customer", "Type of inquiry", "Stage", "Handled by", "Offer prepared by", "Schedule date", "Actual date", "Created", "Move to"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "12px 16px", fontSize: 11, whiteSpace: "nowrap",
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
                      <ReferenceCell c={c} onSaved={patchCase} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
                      {c.customer_code && <div style={{ fontSize: 11.5, color: "var(--text-faint)" }} className="mono">{c.customer_code}</div>}
                    </td>
                    <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.inquiry_type || ""}
                        onChange={(e) => updateInquiryType(c.id, e.target.value || null)}
                        style={{ minWidth: 120 }}
                      >
                        <option value="">Not set</option>
                        {INQUIRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className="stage-pill">
                        <span className="stage-dot" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{c.handled_by_name || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>{c.offer_prepared_by || "—"}</td>
                    <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="date"
                        defaultValue={toDateInput(c.scheduled_offer_date)}
                        onChange={(e) => updateScheduleDate(c.id, e.target.value || null)}
                        style={{ width: 150, padding: "6px 8px", fontSize: 12.5 }}
                      />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {c.offer_prepared_at
                        ? new Date(c.offer_prepared_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-dim)", fontSize: 13, whiteSpace: "nowrap" }}>
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
