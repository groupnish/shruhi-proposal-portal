// Polls the existing business mailbox over IMAP for new (unseen) messages
// and drops each one into the inbound_inquiries review queue. Nothing is
// auto-converted into a case — see migration 013 for why.
//
// Configuration (Render env vars):
//   INBOX_IMAP_HOST      e.g. mail.shruhi.com — ask your host/cPanel for
//                         the exact mail server hostname if unsure.
//   INBOX_IMAP_PORT      defaults to 993 (IMAP over SSL)
//   INBOX_IMAP_USER      the full mailbox address to poll
//   INBOX_IMAP_PASSWORD  the mailbox password
//   INBOX_IMAP_FOLDER    defaults to "INBOX"
//
// This is triggered by an external scheduler hitting POST
// /api/internal/poll-inbox (see routes/inboxPoll.js) — Render's free tier
// sleeps the service after 15 minutes idle, so an in-process setInterval
// alone would not run reliably. A free service like cron-job.org hitting
// that endpoint every 10 minutes both wakes the service and triggers a
// poll in the same request.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { query } from "../db.js";

export async function pollInbox() {
  const { INBOX_IMAP_HOST, INBOX_IMAP_PORT, INBOX_IMAP_USER, INBOX_IMAP_PASSWORD, INBOX_IMAP_FOLDER } = process.env;
  if (!INBOX_IMAP_HOST || !INBOX_IMAP_USER || !INBOX_IMAP_PASSWORD) {
    throw new Error("Inbox polling is not configured — set INBOX_IMAP_HOST, INBOX_IMAP_USER, and INBOX_IMAP_PASSWORD");
  }

  const client = new ImapFlow({
    host: INBOX_IMAP_HOST,
    port: Number(INBOX_IMAP_PORT) || 993,
    secure: true,
    auth: { user: INBOX_IMAP_USER, pass: INBOX_IMAP_PASSWORD },
    logger: false,
  });

  let checked = 0, created = 0, skipped = 0;
  const errors = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock(INBOX_IMAP_FOLDER || "INBOX");
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      for (const uid of uids) {
        checked++;
        try {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg || !msg.source) { skipped++; continue; }

          const parsed = await simpleParser(msg.source);
          // Message-ID is globally unique per email — falls back to a
          // uid+mailbox composite on the rare message that lacks one.
          const messageUid = parsed.messageId || `${INBOX_IMAP_USER}-uid-${uid}`;
          const fromAddr = parsed.from?.value?.[0]?.address || null;
          const fromName = parsed.from?.value?.[0]?.name || null;
          const bodyText = (parsed.text || "").trim().slice(0, 20000);

          let matchedCustomerId = null;
          if (fromAddr) {
            const match = await query(`SELECT id FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`, [fromAddr]);
            matchedCustomerId = match.rows[0]?.id || null;
          }

          const inserted = await query(
            `INSERT INTO inbound_inquiries (message_uid, from_email, from_name, subject, body_text, received_at, matched_customer_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (message_uid) DO NOTHING
             RETURNING id`,
            [messageUid, fromAddr, fromName, parsed.subject || null, bodyText, parsed.date || new Date(), matchedCustomerId]
          );

          if (inserted.rows.length) created++; else skipped++;

          // Mark as seen either way, so a message that failed to insert
          // (e.g. a genuine duplicate) doesn't get re-fetched forever.
          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
        } catch (err) {
          errors.push({ uid, message: err.message });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return { checked, created, skipped, errors };
}
