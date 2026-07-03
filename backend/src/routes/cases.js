import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Maps a stage -> which convenience timestamp column on `cases` to stamp
// when a case first enters that stage.
const STAGE_TIMESTAMP_COLUMN = {
  costing: "costing_started_at",
  costing_complete: "costing_completed_at",
  offer_prepared: "offer_prepared_at",
  offer_sent: "offer_sent_at",
  won: "closed_at",
  lost: "closed_at",
};

// GET /api/cases — list, newest first
router.get("/", async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, cu.name AS customer_name, cu.code AS customer_code
     FROM cases c JOIN customers cu ON cu.id = c.customer_id
     ORDER BY c.created_at DESC`
  );
  res.json(rows);
});

// POST /api/cases — create a case. Body: { customer: {id?|name,code,attn,email,phone}, requirement_text }
router.post("/", async (req, res) => {
  const { customer, requirement_text } = req.body;
  if (!customer || (!customer.id && !customer.name)) {
    return res.status(400).json({ error: "customer.id or customer.name is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let customerId = customer.id;
    if (!customerId) {
      const { rows } = await client.query(
        `INSERT INTO customers (name, code, attn, email, phone)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [customer.name, customer.code || null, customer.attn || null, customer.email || null, customer.phone || null]
      );
      customerId = rows[0].id;
    }

    const { rows: caseRows } = await client.query(
      `INSERT INTO cases (customer_id, requirement_text, assigned_sales_engineer, stage)
       VALUES ($1,$2,$3,'enquiry') RETURNING *`,
      [customerId, requirement_text || null, req.user.id]
    );
    const created = caseRows[0];

    await client.query(
      `INSERT INTO case_events (case_id, from_stage, to_stage, changed_by, note)
       VALUES ($1, NULL, 'enquiry', $2, 'Case created')`,
      [created.id, req.user.id]
    );

    await client.query("COMMIT");
    res.status(201).json(created);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to create case" });
  } finally {
    client.release();
  }
});

// GET /api/cases/:id — full detail incl. event history and costing items
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const caseRow = (await query(
    `SELECT c.*, cu.name AS customer_name, cu.code AS customer_code, cu.email AS customer_email
     FROM cases c JOIN customers cu ON cu.id = c.customer_id WHERE c.id = $1`,
    [id]
  )).rows[0];
  if (!caseRow) return res.status(404).json({ error: "Case not found" });

  const events = (await query(
    `SELECT e.*, u.name AS changed_by_name FROM case_events e
     LEFT JOIN users u ON u.id = e.changed_by WHERE e.case_id = $1 ORDER BY e.created_at ASC`,
    [id]
  )).rows;

  const costingItems = (await query(
    `SELECT * FROM costing_items WHERE case_id = $1 ORDER BY sort_order ASC, id ASC`,
    [id]
  )).rows;

  res.json({ ...caseRow, events, costing_items: costingItems });
});

// PATCH /api/cases/:id/stage — body: { stage, note? }
// Writes the audit event AND updates the convenience timestamp on `cases`.
router.patch("/:id/stage", async (req, res) => {
  const { id } = req.params;
  const { stage, note } = req.body;
  const validStages = ["enquiry","costing","costing_complete","offer_prepared","offer_sent","negotiation","won","lost"];
  if (!validStages.includes(stage)) {
    return res.status(400).json({ error: `stage must be one of ${validStages.join(", ")}` });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const current = (await client.query("SELECT stage FROM cases WHERE id = $1 FOR UPDATE", [id])).rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Case not found" });
    }

    const tsCol = STAGE_TIMESTAMP_COLUMN[stage];
    const outcome = stage === "won" || stage === "lost" ? stage : null;

    await client.query(
      `UPDATE cases SET stage = $1, outcome = COALESCE($2, outcome)
       ${tsCol ? `, ${tsCol} = now()` : ""}
       WHERE id = $3`,
      [stage, outcome, id]
    );

    await client.query(
      `INSERT INTO case_events (case_id, from_stage, to_stage, changed_by, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, current.stage, stage, req.user.id, note || null]
    );

    await client.query("COMMIT");
    const updated = (await query("SELECT * FROM cases WHERE id = $1", [id])).rows[0];
    res.json(updated);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Failed to update stage" });
  } finally {
    client.release();
  }
});

export default router;
