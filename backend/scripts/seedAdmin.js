// Creates (or updates) the first Admin user.
// Usage: node scripts/seedAdmin.js --name "Manan" --email manan@shruhi.com [--password "..."]
// If --password is omitted, a random temporary password is generated and
// printed once — save it, it won't be shown again. Change it after first login.
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../src/db.js";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

async function run() {
  const name = arg("name", "Admin");
  const email = arg("email");
  if (!email) {
    console.error("Usage: node scripts/seedAdmin.js --name \"Manan\" --email manan@shruhi.com [--password ...]");
    process.exit(1);
  }
  const password = arg("password") || crypto.randomBytes(9).toString("base64url");
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
    [name, email, hash]
  );

  console.log(`Admin user ready: ${email}`);
  if (!arg("password")) {
    console.log(`Temporary password: ${password}`);
    console.log("Save this now — change it after first login. It will not be shown again.");
  }
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
