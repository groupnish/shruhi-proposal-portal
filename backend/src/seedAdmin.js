// Shared admin-seed logic. Used by:
//  - scripts/seedAdmin.js (CLI, for local dev)
//  - server.js (auto-run on boot from ADMIN_EMAIL/ADMIN_NAME/ADMIN_PASSWORD env
//    vars, so it works without Shell access on free tier)
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Returns { email, generatedPassword } — generatedPassword is null if a
// password was explicitly supplied (so the caller knows whether to print it).
export async function seedAdmin(pool, { name, email, password }) {
  if (!email) throw new Error("email is required");
  const finalName = name || "Admin";
  const generated = !password;
  const finalPassword = password || crypto.randomBytes(9).toString("base64url");
  const hash = await bcrypt.hash(finalPassword, 10);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
    [finalName, email, hash]
  );

  return { email, generatedPassword: generated ? finalPassword : null };
}
