import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

function suggestPrice(list, disc, margin) {
  const l = Number(list) || 0;
  const d = Number(disc) || 0;
  const m = Number(margin) || 0;
  const raw = l * (1 - d / 100) * (1 + m / 100);
  return Math.ceil(raw / 100) * 100;
}

function DecodedNameplate({ result }) {
  if (!result) return null;
  if (!result.matched) {
    return (
      <div style={{ color: "var(--amber)", fontSize: 13, padding: "10px 0" }}>
        {result.message || "No matching family found for this code."}
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        <span className="ref-stamp" style={{ marginRight: 8 }}>{result.family.base_code}</span>
        <span style={{ color: "var(--text-dim)" }}>{result.family.family} — {result.family.short_name}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {result.positions.map((p) => (
          <span
            key={p.position_no}
            title={p.name}
            className="mono"
            style={{
              fontSize: 12, padding: "3px 7px", borderRadius: 5,
              background: p.matched ? "var(--teal-ink)" : "#3a2f06",
              color: p.matched ? "var(--teal)" : "var(--amber)",
              border: `1px solid ${p.matched ? "#0c5a5b" : "#5a4a0c"}`,
            }}
          >
            {p.character ?? "?"}
          </span>
        ))}
      </div>
      {result.bullets.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--text-dim)" }}>
          {result.bullets.map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
        </ul>
      )}
      {result.leftover && (
        <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 6 }}>
          Unrecognized trailing characters: <span className="mono">{result.leftover}</span>
        </div>
      )}
    </div>
  );
}

function PriceFields({ list, setList, disc, setDisc, margin, setMargin, qty, setQty, price, setPrice }) {
  useEffect(() => {
    setPrice(String(suggestPrice(list, disc, margin)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, disc, margin]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
      <div>
        <label className="fl">Qty</label>
        <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      <div>
        <label className="fl">List price (₹)</label>
        <input type="number" value={list} onChange={(e) => setList(e.target.value)} placeholder="Siemens portal price" />
      </div>
      <div>
        <label className="fl">Discount %</label>
        <input type="number" value={disc} onChange={(e) => setDisc(e.target.value)} />
      </div>
      <div>
        <label className="fl">Margin %</label>
        <input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} />
      </div>
      <div>
        <label className="fl">Offer unit price (₹)</label>
        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
    </div>
  );
}

function CatalogEntry({ onAdd }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [list, setList] = useState("0");
  const [disc, setDisc] = useState("60");
  const [margin, setMargin] = useState("30");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");

  async function decode() {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const r = await api.decodeModel(code);
      setResult(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function add() {
    if (!result || !result.matched) return;
    onAdd({
      source: "catalog",
      model_code: code.trim(),
      family: result.family.base_code,
      description: result.description,
      config_bullets: result.bullets,
      addons: [],
      qty: Number(qty) || 1,
      list_price: Number(list) || 0,
      discount_pct: Number(disc) || 0,
      margin_pct: Number(margin) || 0,
      final_unit_price: Number(price) || 0,
    });
    setCode(""); setResult(null); setList("0"); setPrice("0");
  }

  return (
    <div>
      <label className="fl">Model code</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. 7ML5111-0B... or 7ME6310-2Y..."
          onKeyDown={(e) => e.key === "Enter" && decode()}
          className="mono"
        />
        <button className="btn-ghost" onClick={decode} disabled={loading} style={{ whiteSpace: "nowrap" }}>
          {loading ? "Decoding…" : "Decode"}
        </button>
      </div>
      {error && <div style={{ color: "var(--red)", fontSize: 12.5, marginTop: 8 }}>{error}</div>}
      <DecodedNameplate result={result} />
      {result?.matched && (
        <>
          <PriceFields {...{ list, setList, disc, setDisc, margin, setMargin, qty, setQty, price, setPrice }} />
          <button className="btn-primary" onClick={add} style={{ marginTop: 14 }}>Add line item</button>
        </>
      )}
    </div>
  );
}

function ManualEntry({ onAdd }) {
  const [description, setDescription] = useState("");
  const [list, setList] = useState("0");
  const [disc, setDisc] = useState("60");
  const [margin, setMargin] = useState("30");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");

  function add() {
    if (!description.trim()) return;
    onAdd({
      source: "manual",
      description: description.trim(),
      config_bullets: [],
      addons: [],
      qty: Number(qty) || 1,
      list_price: Number(list) || 0,
      discount_pct: Number(disc) || 0,
      margin_pct: Number(margin) || 0,
      final_unit_price: Number(price) || 0,
    });
    setDescription(""); setList("0"); setPrice("0");
  }

  return (
    <div>
      <label className="fl">Description</label>
      <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Free-text item description" />
      <PriceFields {...{ list, setList, disc, setDisc, margin, setMargin, qty, setQty, price, setPrice }} />
      <button className="btn-primary" onClick={add} style={{ marginTop: 14 }}>Add line item</button>
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("catalog");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [c, i] = await Promise.all([api.getCase(id), api.listCosting(id)]);
    setCaseData(c);
    setItems(i);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, [id]);

  async function handleAdd(payload) {
    await api.addCosting(id, payload);
    refresh();
  }

  async function handleDelete(itemId) {
    await api.deleteCosting(itemId);
    refresh();
  }

  const total = items.reduce((sum, it) => sum + Number(it.final_unit_price) * Number(it.qty), 0);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-faint)" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 60px", width: "100%" }}>
      <Link to="/cases" style={{ fontSize: 12.5, color: "var(--text-faint)", textDecoration: "none" }}>&larr; Back to cases</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "10px 0 6px" }}>
        <span className="ref-stamp">CASE-{String(caseData.id).padStart(4, "0")}</span>
        <h1 style={{ fontSize: 22 }}>{caseData.customer_name}</h1>
      </div>
      {caseData.requirement_text && (
        <p style={{ color: "var(--text-dim)", fontSize: 13.5, maxWidth: 700 }}>{caseData.requirement_text}</p>
      )}

      <h2 style={{ fontSize: 15, marginTop: 30, marginBottom: 12 }}>Costing</h2>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setMode("catalog")}
            className={mode === "catalog" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "7px 14px", fontSize: 12.5 }}
          >Catalog-assisted</button>
          <button
            onClick={() => setMode("manual")}
            className={mode === "manual" ? "btn-primary" : "btn-ghost"}
            style={{ padding: "7px 14px", fontSize: 12.5 }}
          >Manual entry</button>
        </div>
        {mode === "catalog" ? <CatalogEntry onAdd={handleAdd} /> : <ManualEntry onAdd={handleAdd} />}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {!items.length ? (
          <div className="empty-state">No costing lines yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Description", "Qty", "Unit price", "Total", ""].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 14px", fontSize: 11,
                    letterSpacing: 0.5, textTransform: "uppercase", color: "var(--text-faint)", fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 13 }}>{it.description}</div>
                    {it.model_code && <div className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{it.model_code}</div>}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>{it.qty}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>₹{Number(it.final_unit_price).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>
                    ₹{(Number(it.final_unit_price) * Number(it.qty)).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button className="btn-ghost" onClick={() => handleDelete(it.id)} style={{ padding: "5px 10px", fontSize: 11.5 }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: "12px 14px", textAlign: "right", fontSize: 12.5, color: "var(--text-faint)" }}>
                  Total
                </td>
                <td colSpan={2} style={{ padding: "12px 14px", fontSize: 15, fontWeight: 700, color: "var(--teal)" }}>
                  ₹{total.toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
