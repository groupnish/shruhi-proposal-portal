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
    `SELECT c.*, cu.name AS customer_name, cu.code AS customer_code,
            handler.name AS handled_by_name,
            (SELECT u.name FROM offers o JOIN users u ON u.id = o.prepared_by
             WHERE o.case_id = c.id ORDER BY o.revision DESC LIMIT 1) AS offer_prepared_by
     FROM cases c
     JOIN customers cu ON cu.id = c.customer_id
     LEFT JOIN users handler ON handler.id = c.assigned_sales_engineer
     ORDER BY c.created_at DESC`
  );
  res.json(rows);
});

// POST /api/cases — create a case. Body: { customer: {id} or {name,code,contact_person,email,phone,address,gst_number}, requirement_text, inquiry_type?, scheduled_offer_date? }
router.post("/", async (req, res) => {
  const { customer, requirement_text, inquiry_type, scheduled_offer_date } = req.body;
  if (!customer || (!customer.id && !customer.name)) {
    return res.status(400).json({ error: "customer.id or customer.name is required" });
  }
  if (inquiry_type && !["purchase", "budgetary", "tender"].includes(inquiry_type)) {
    return res.status(400).json({ error: "inquiry_type must be purchase, budgetary, or tender" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let customerId = customer.id;
    if (!customerId) {
      const { rows } = await client.query(
        `INSERT INTO customers (name, code, contact_person, email, phone, address, gst_number)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          customer.name, customer.code || null, customer.contact_person || null,
          customer.email || null, customer.phone || null, customer.address || null, customer.gst_number || null,
        ]
      );
      customerId = rows[0].id;
    }

    const { rows: caseRows } = await client.query(
      `INSERT INTO cases (customer_id, requirement_text, assigned_sales_engineer, stage, inquiry_type, scheduled_offer_date)
       VALUES ($1,$2,$3,'enquiry',$4,$5) RETURNING *`,
      [customerId, requirement_text || null, req.user.id, inquiry_type || null, scheduled_offer_date || null]
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

// PATCH /api/cases/:id/notes — free-text note the engineer can set before
// generating an offer (e.g. "Installation accessories not included").
// Snapshotted onto each offer at generation time.
router.patch("/:id/notes", async (req, res) => {
  const { rows } = await query(
    `UPDATE cases SET notes = $1 WHERE id = $2 RETURNING *`,
    [req.body.notes ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Case not found" });
  res.json(rows[0]);
});

// PATCH /api/cases/:id/reference — editable case reference (falls back to
// CASE-NNNN display in the UI when this is unset).
router.patch("/:id/reference", async (req, res) => {
  const reference = (req.body.reference || "").trim() || null;
  try {
    const { rows } = await query(
      `UPDATE cases SET reference = $1 WHERE id = $2 RETURNING *`,
      [reference, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Case not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "That reference is already used by another case" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update reference" });
  }
});

// PATCH /api/cases/:id/details — inquiry type and/or scheduled proposal
// date. The "actual" date is not set here — it's the existing
// offer_prepared_at timestamp, captured automatically when an offer is
// generated.
router.patch("/:id/details", async (req, res) => {
  const { inquiry_type, scheduled_offer_date } = req.body;
  if (inquiry_type !== undefined && inquiry_type !== null && !["purchase", "budgetary", "tender"].includes(inquiry_type)) {
    return res.status(400).json({ error: "inquiry_type must be purchase, budgetary, or tender" });
  }

  const sets = [];
  const vals = [];
  let i = 1;
  if (inquiry_type !== undefined) { sets.push(`inquiry_type = $${i}`); vals.push(inquiry_type); i++; }
  if (scheduled_offer_date !== undefined) { sets.push(`scheduled_offer_date = $${i}`); vals.push(scheduled_offer_date || null); i++; }
  if (!sets.length) return res.status(400).json({ error: "No updatable fields provided" });
  vals.push(req.params.id);

  const { rows } = await query(`UPDATE cases SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, vals);
  if (!rows[0]) return res.status(404).json({ error: "Case not found" });
  res.json(rows[0]);
});

export default router;
