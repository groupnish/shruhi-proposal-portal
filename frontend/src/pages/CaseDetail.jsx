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
              background: p.matched ? "var(--teal-ink)" : "var(--amber-ink)",
              color: p.matched ? "var(--teal-deep)" : "var(--amber)",
              border: `1px solid ${p.matched ? "var(--teal-border)" : "#f5cb8f"}`,
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

function FamilyPicker({ onSelect }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.searchFamilies(q);
        setResults(r);
        setOpen(true);
      } catch { /* ignore, user can retry */ }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search family — e.g. LU240, MAG 3100, LT500"
      />
      {open && results.length > 0 && (
        <div className="card" style={{
          position: "absolute", zIndex: 10, top: "calc(100% + 4px)", left: 0, right: 0,
          maxHeight: 240, overflowY: "auto",
        }}>
          {results.map((f) => (
            <div
              key={f.base_code}
              onClick={() => { onSelect(f); setOpen(false); setQ(""); }}
              style={{ padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--line-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span className="ref-stamp" style={{ marginRight: 8 }}>{f.base_code}</span>
              <span style={{ fontSize: 13 }}>{f.family}</span>
              <span style={{ fontSize: 11.5, color: "var(--text-faint)", marginLeft: 6 }}>{f.short_name}</span>
            </div>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>No matching family.</div>
      )}
    </div>
  );
}

function ModelBuilder({ onAdd }) {
  const [family, setFamily] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selections, setSelections] = useState({});
  const [suffixSel, setSuffixSel] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [list, setList] = useState("0");
  const [disc, setDisc] = useState("60");
  const [margin, setMargin] = useState("30");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("0");

  async function selectFamily(f) {
    setLoadError("");
    try {
      const d = await api.getFamily(f.base_code);
      const sorted = [...d.positions].sort((a, b) => a.position_no - b.position_no);
      const defaults = {};
      sorted.forEach((p) => { defaults[p.position_no] = p.is_fix ? (p.options[0]?.character || "") : ""; });
      setDetail({ ...d, positions: sorted });
      setFamily(f);
      setSelections(defaults);
      setSuffixSel([]);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  function reset() {
    setFamily(null); setDetail(null); setSelections({}); setSuffixSel([]);
    setList("0"); setPrice("0");
  }

  useEffect(() => { setPrice(String(suggestPrice(list, disc, margin))); }, [list, disc, margin]);

  if (!family) {
    return (
      <div>
        <label className="fl">Select Siemens family</label>
        <FamilyPicker onSelect={selectFamily} />
        {loadError && <div style={{ color: "var(--red)", fontSize: 12.5, marginTop: 8 }}>{loadError}</div>}
      </div>
    );
  }

  const allChosen = detail.positions.every((p) => selections[p.position_no]);

  const code = detail.base_code
    + detail.positions.map((p) => selections[p.position_no] || "\u00b7").join("")
    + (suffixSel.length ? "-Z " + suffixSel.join(" ") : "");

  const bullets = detail.positions
    .filter((p) => !p.is_fix && selections[p.position_no])
    .map((p) => {
      const opt = p.options.find((o) => o.character === selections[p.position_no]);
      return opt ? `${p.name}: ${opt.meaning}` : null;
    })
    .filter(Boolean)
    .concat(
      suffixSel
        .map((code) => detail.suffixes.find((s) => s.code === code)?.meaning)
        .filter(Boolean)
    );

  const description = [detail.description, ...bullets].filter(Boolean).join(" ");

  function add() {
    if (!allChosen) return;
    onAdd({
      source: "catalog", model_code: code, family: detail.base_code, description,
      config_bullets: bullets, addons: [],
      qty: Number(qty) || 1, list_price: Number(list) || 0,
      discount_pct: Number(disc) || 0, margin_pct: Number(margin) || 0,
      final_unit_price: Number(price) || 0,
    });
    reset();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <span className="ref-stamp" style={{ marginRight: 8 }}>{family.base_code}</span>
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{family.family} — {family.short_name}</span>
        </div>
        <button className="btn-ghost" onClick={reset} style={{ padding: "5px 10px", fontSize: 11.5 }}>Change family</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {detail.positions.map((p) => (
          <div key={p.position_no}>
            <label className="fl">{p.name}{p.is_fix ? " (fixed)" : ""}</label>
            <select
              value={selections[p.position_no] || ""}
              disabled={p.is_fix}
              onChange={(e) => setSelections((s) => ({ ...s, [p.position_no]: e.target.value }))}
            >
              {!p.is_fix && <option value="" disabled>Choose…</option>}
              {p.options.map((o) => (
                <option key={o.character} value={o.character}>{o.character} — {o.meaning}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {detail.suffixes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <label className="fl">Options / approvals (optional)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {detail.suffixes.map((s) => {
              const checked = suffixSel.includes(s.code);
              return (
                <label
                  key={s.code}
                  title={s.meaning}
                  className="mono"
                  style={{
                    fontSize: 11.5, padding: "5px 9px", borderRadius: 6, cursor: "pointer",
                    border: `1px solid ${checked ? "var(--teal-border)" : "var(--line)"}`,
                    background: checked ? "var(--teal-ink)" : "var(--panel-2)",
                    color: checked ? "var(--teal-deep)" : "var(--text-dim)",
                  }}
                >
                  <input
                    type="checkbox" checked={checked} style={{ marginRight: 5 }}
                    onChange={() => setSuffixSel((sel) => (checked ? sel.filter((c) => c !== s.code) : [...sel, s.code]))}
                  />
                  {s.code}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, background: "var(--panel-2)", borderRadius: 8 }}>
        <div className="mono" style={{ fontSize: 13, color: "var(--teal)", marginBottom: bullets.length ? 8 : 0 }}>{code}</div>
        {bullets.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--text-dim)" }}>
            {bullets.map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}
          </ul>
        )}
      </div>

      <PriceFields {...{ list, setList, disc, setDisc, margin, setMargin, qty, setQty, price, setPrice }} />
      <button className="btn-primary" onClick={add} disabled={!allChosen} style={{ marginTop: 14 }}>
        Add line item
      </button>
    </div>
  );
}

function PasteCodeEntry({ onAdd }) {
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
  const [catalogSubMode, setCatalogSubMode] = useState("build");
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
        {mode === "catalog" ? (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <button
                onClick={() => setCatalogSubMode("build")}
                style={{
                  padding: "5px 11px", fontSize: 11.5, borderRadius: 6, border: "1px solid var(--line)",
                  background: catalogSubMode === "build" ? "var(--panel-3)" : "transparent",
                  color: catalogSubMode === "build" ? "var(--text)" : "var(--text-faint)",
                }}
              >Build from options</button>
              <button
                onClick={() => setCatalogSubMode("paste")}
                style={{
                  padding: "5px 11px", fontSize: 11.5, borderRadius: 6, border: "1px solid var(--line)",
                  background: catalogSubMode === "paste" ? "var(--panel-3)" : "transparent",
                  color: catalogSubMode === "paste" ? "var(--text)" : "var(--text-faint)",
                }}
              >Paste a code</button>
            </div>
            {catalogSubMode === "build" ? <ModelBuilder onAdd={handleAdd} /> : <PasteCodeEntry onAdd={handleAdd} />}
          </>
        ) : (
          <ManualEntry onAdd={handleAdd} />
        )}
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
