import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import CustomerPicker from "../components/CustomerPicker.jsx";
import { stageMeta, INQUIRY_TYPES, SEGMENTS } from "../constants.js";

const defaultRef = (c) => `CASE-${String(c.id).padStart(4, "0")}`;
const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—");

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
          style={{ width: 110, padding: "3px 6px", fontSize: 11.5 }}
          autoFocus
        />
        <button className="btn-ghost" onClick={save} disabled={saving} style={{ padding: "3px 7px", fontSize: 10.5 }}>
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
  const [segment, setSegment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(SEGMENTS[0].value);

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
    if (!segment) { setError("Select a segment (WW, Industries, or Instrument Service)"); return; }
    try {
      await api.createCase({
        customer: { id: selectedCustomer.id },
        requirement_text: requirement,
        inquiry_type: inquiryType || null,
        scheduled_offer_date: scheduleDate || null,
        segment,
      });
      setSelectedCustomer(null);
      setRequirement("");
      setInquiryType("");
      setScheduleDate("");
      setSegment("");
      setShowForm(false);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateInquiryType(id, inquiry_type) {
    const updated = await api.updateCaseDetails(id, { inquiry_type });
    patchCase(updated);
  }

  async function updateSegment(id, newSegment) {
    const updated = await api.updateCaseDetails(id, { segment: newSegment });
    patchCase(updated);
  }

  async function updateScheduleDate(id, scheduled_offer_date) {
    const updated = await api.updateCaseDetails(id, { scheduled_offer_date });
    patchCase(updated);
  }

  const th = {
    textAlign: "left", padding: "9px 10px", fontSize: 10.5, whiteSpace: "nowrap",
    letterSpacing: 0.3, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 600,
  };
  const td = { padding: "9px 10px", fontSize: 12.5 };

  // Legacy cases created before the segment field existed have segment = null.
  // Bucket those under an "Unassigned" tab so they're findable and can be
  // tagged, rather than silently disappearing from every segment tab.
  const TABS = [...SEGMENTS, { value: "unassigned", label: "Unassigned" }];
  const tabCases = cases.filter((c) =>
    activeTab === "unassigned" ? !c.segment : c.segment === activeTab
  );

  return (
    <div style={{ width: "100%", padding: "36px 24px 60px" }}>
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
          setSegment("");
          setError("");
        }}>
          {showForm ? "Cancel" : "+ New case"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ padding: 22, marginBottom: 22, maxWidth: 700 }}>
          <div style={{ marginBottom: 16 }}>
            <label className="fl">Customer</label>
            <CustomerPicker value={selectedCustomer} onChange={setSelectedCustomer} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="fl">Segment</label>
            <select value={segment} onChange={(e) => setSegment(e.target.value)} required>
              <option value="">Select segment…</option>
              {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
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

      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: "1px solid var(--line)" }}>
        {TABS.map((t) => {
          const count = cases.filter((c) => (t.value === "unassigned" ? !c.segment : c.segment === t.value)).length;
          const active = activeTab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              style={{
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid var(--teal-deep)" : "2px solid transparent",
                color: active ? "var(--teal-deep)" : "var(--text-dim)",
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                padding: "8px 4px",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
              <span style={{ marginLeft: 6, fontSize: 11, color: "var(--text-faint)" }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : !cases.length ? (
          <div className="empty-state">
            No cases yet. Start with <b style={{ color: "var(--text-dim)" }}>+ New case</b> above.
          </div>
        ) : !tabCases.length ? (
          <div className="empty-state">No cases in this segment yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                <th style={th}>Reference</th>
                <th style={th}>Customer</th>
                <th style={th}>Segment</th>
                <th style={th}>Inquiry</th>
                <th style={th}>Stage</th>
                <th style={th}>Handled by</th>
                <th style={th}>Prepared by</th>
                <th style={th}>Schedule</th>
                <th style={th}>Actual</th>
                <th style={th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {tabCases.map((c) => {
                const meta = stageMeta(c.stage);
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/cases/${c.id}`)}
                    style={{ borderBottom: "1px solid var(--line-soft)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={td}>
                      <ReferenceCell c={c} onSaved={patchCase} />
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight: 500 }}>{c.customer_name}</div>
                      {c.customer_code && <div style={{ fontSize: 10.5, color: "var(--text-faint)" }} className="mono">{c.customer_code}</div>}
                    </td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.segment || ""}
                        onChange={(e) => updateSegment(c.id, e.target.value || null)}
                        style={{ width: "auto", padding: "4px 6px", fontSize: 11.5 }}
                      >
                        <option value="">—</option>
                        {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.inquiry_type || ""}
                        onChange={(e) => updateInquiryType(c.id, e.target.value || null)}
                        style={{ width: "auto", padding: "4px 6px", fontSize: 11.5 }}
                      >
                        <option value="">—</option>
                        {INQUIRY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <span className="stage-pill">
                        <span className="stage-dot" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{c.handled_by_name || "—"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{c.offer_prepared_by || "—"}</td>
                    <td style={td} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="date"
                        defaultValue={toDateInput(c.scheduled_offer_date)}
                        onChange={(e) => updateScheduleDate(c.id, e.target.value || null)}
                        style={{ width: 128, padding: "4px 6px", fontSize: 11.5 }}
                      />
                    </td>
                    <td style={{ ...td, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{shortDate(c.offer_prepared_at)}</td>
                    <td style={{ ...td, color: "var(--text-dim)", whiteSpace: "nowrap" }}>{shortDate(c.created_at)}</td>
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
