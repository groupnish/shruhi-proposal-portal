import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

// Mounted at /api/cases/:caseId/costing
export const caseItemsRouter = Router({ mergeParams: true });
caseItemsRouter.use(requireAuth);

caseItemsRouter.get("/", async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM costing_items WHERE case_id = $1 ORDER BY sort_order ASC, id ASC`,
    [req.params.caseId]
  );
  res.json(rows);
});

caseItemsRouter.post("/", async (req, res) => {
  const { caseId } = req.params;
  const {
    source, model_code, family, description, instrument_name, product_name, range_value,
    config_bullets, addons, qty, list_price, discount_pct, margin_pct, final_unit_price,
  } = req.body;

  if (!description) return res.status(400).json({ error: "description is required" });
  if (!["catalog", "manual"].includes(source)) {
    return res.status(400).json({ error: "source must be 'catalog' or 'manual'" });
  }

  const { rows } = await query(
    `INSERT INTO costing_items
       (case_id, source, model_code, family, description, instrument_name, product_name, range_value,
        config_bullets, addons, qty, list_price, discount_pct, margin_pct, final_unit_price, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
       (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM costing_items WHERE case_id = $1))
     RETURNING *`,
    [
      caseId, source, model_code || null, family || null, description,
      instrument_name || null, product_name || null, range_value || null,
      JSON.stringify(config_bullets || []), JSON.stringify(addons || []),
      qty || 1, list_price || 0, discount_pct ?? 60, margin_pct ?? 30, final_unit_price || 0,
    ]
  );
  res.status(201).json(rows[0]);
});

// Mounted at /api/costing
export const itemRouter = Router();
itemRouter.use(requireAuth);

const UPDATABLE_FIELDS = [
  "description", "qty", "list_price", "discount_pct", "margin_pct",
  "final_unit_price", "config_bullets", "addons", "model_code", "family", "sort_order",
  "instrument_name", "product_name", "range_value",
];

itemRouter.patch("/:id", async (req, res) => {
  const sets = [];
  const vals = [];
  let i = 1;
  for (const f of UPDATABLE_FIELDS) {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${i}`);
      vals.push(["config_bullets", "addons"].includes(f) ? JSON.stringify(req.body[f]) : req.body[f]);
      i++;
    }
  }
  if (!sets.length) return res.status(400).json({ error: "No updatable fields provided" });
  vals.push(req.params.id);

  const { rows } = await query(`UPDATE costing_items SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, vals);
  if (!rows[0]) return res.status(404).json({ error: "Costing item not found" });
  res.json(rows[0]);
});

itemRouter.delete("/:id", async (req, res) => {
  await query(`DELETE FROM costing_items WHERE id = $1`, [req.params.id]);
  res.status(204).end();
});
