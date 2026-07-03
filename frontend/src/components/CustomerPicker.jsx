import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function CustomerPicker({ value, onChange }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", contact_person: "", email: "", phone: "", address: "", gst_number: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.searchCustomers(q);
        setResults(r);
        setOpen(true);
      } catch { /* ignore, user can retry */ }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function saveNew(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const created = await api.createCustomer(form);
      onChange(created);
      setShowNewForm(false);
      setForm({ name: "", code: "", contact_person: "", email: "", phone: "", address: "", gst_number: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (value) {
    return (
      <div className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{value.name}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-faint)" }}>
            {[value.code, value.contact_person, value.gst_number].filter(Boolean).join(" · ") || "No further details on file"}
          </div>
        </div>
        <button type="button" className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11.5 }} onClick={() => onChange(null)}>
          Change
        </button>
      </div>
    );
  }

  if (showNewForm) {
    return (
      <form onSubmit={saveNew} className="card" style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, color: "var(--text-faint)", marginBottom: 12 }}>
          Adding to the customer master list — this record will be available to pick for any future case.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label className="fl">Customer name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="fl">Customer code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SAHAJANAND" />
          </div>
          <div>
            <label className="fl">Contact person</label>
            <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          </div>
          <div>
            <label className="fl">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="fl">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="fl">GST number</label>
            <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="fl">Address</label>
          <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        {error && <div style={{ color: "var(--red)", fontSize: 12.5, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save customer"}</button>
          <button type="button" className="btn-ghost" onClick={() => setShowNewForm(false)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search existing customer by name, code, or GST…"
        />
        <button type="button" className="btn-ghost" onClick={() => setShowNewForm(true)} style={{ whiteSpace: "nowrap" }}>
          + New customer
        </button>
      </div>
      {open && results.length > 0 && (
        <div className="card" style={{
          position: "absolute", zIndex: 10, top: "calc(100% + 4px)", left: 0, right: 0,
          maxHeight: 240, overflowY: "auto",
        }}>
          {results.map((c) => (
            <div
              key={c.id}
              onClick={() => { onChange(c); setOpen(false); setQ(""); }}
              style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--line-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                {[c.code, c.contact_person, c.gst_number].filter(Boolean).join(" · ")}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>
          No matching customer — use "+ New customer" to add one.
        </div>
      )}
    </div>
  );
}
