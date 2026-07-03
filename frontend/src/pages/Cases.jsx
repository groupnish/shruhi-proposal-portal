import { useEffect, useState } from "react";
import { api } from "../api.js";

const STAGES = ["enquiry","costing","costing_complete","offer_prepared","offer_sent","negotiation","won","lost"];

export default function Cases({ user }) {
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerCode: "", requirement: "" });
  const [error, setError] = useState("");

  async function refresh() {
    setCases(await api.listCases());
  }
  useEffect(() => { refresh(); }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createCase({
        customer: { name: form.customerName, code: form.customerCode },
        requirement_text: form.requirement,
      });
      setForm({ customerName: "", customerCode: "", requirement: "" });
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
    <div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Cases {user ? `— ${user.name}` : ""}</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New case"}</button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ border: "1px solid #ccc", padding: 16, marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <label>Customer name</label>
            <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required style={{ width: "100%", padding: 6 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Customer code</label>
            <input value={form.customerCode} onChange={(e) => setForm({ ...form, customerCode: e.target.value })} style={{ width: "100%", padding: 6 }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Requirement</label>
            <textarea value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} rows={3} style={{ width: "100%", padding: 6 }} />
          </div>
          {error && <div style={{ color: "crimson" }}>{error}</div>}
          <button type="submit">Create case</button>
        </form>
      )}

      <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>#</th><th>Customer</th><th>Stage</th><th>Created</th><th>Move to</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{c.id}</td>
              <td>{c.customer_name}</td>
              <td>{c.stage}</td>
              <td>{new Date(c.created_at).toLocaleDateString()}</td>
              <td>
                <select defaultValue="" onChange={(e) => e.target.value && moveStage(c.id, e.target.value)}>
                  <option value="" disabled>choose stage…</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {!cases.length && <tr><td colSpan={5}>No cases yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
