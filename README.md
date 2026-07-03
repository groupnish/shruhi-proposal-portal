# Shruhi Instrumentation — Proposal Management Portal

Milestone 1 scaffold: repo structure, database schema, Admin auth, and a
working case-entry skeleton (create a case, list cases, move a case through
stages — each move is logged to `case_events`).

Matches `shruhi-proposal-portal-buildplan.md` — read that first for the
overall architecture and roadmap.

---

## What's built vs. what's next

**Built (Milestone 1):**
- Full DB schema (`backend/src/migrations/001_init.sql`) — users, customers,
  cases, case_events (audit log), costing_items, offers, reminders, and the
  Siemens decode-only catalog tables.
- Login (JWT-based) + role field on users (admin / sales_engineer / costing_engineer).
- Case create + list + stage transitions, with every transition logged.
- Minimal React frontend: login page, case list + create form, stage-move dropdown.
- Render blueprint (`render.yaml`) wiring API + static frontend + Postgres together.

**Not yet built** (later milestones, per the build plan):
- Costing tab (catalog-assisted + manual line items).
- Offer PDF generation (Puppeteer).
- Reminders (cron sweep + email).
- Siemens catalog import + product-selection UI.

---

## 1. Local development

**Requirements:** Node 18+, a local Postgres (or a free Render Postgres instance).

```bash
# Backend
cd backend
cp .env.example .env        # edit DATABASE_URL to point at your Postgres
npm install
npm run migrate             # creates all tables
npm run seed:admin -- --name "Manan" --email manan@shruhi.com
# ^ prints a temporary password — save it, then change it after first login
npm run dev                 # API on http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # UI on http://localhost:5173, proxies /api to :4000
```

Open http://localhost:5173, log in with the email above and the printed
temporary password.

---

## 2. Deploying — API + database on Render, frontend on GitHub Pages

**Frontend hosting has moved to GitHub Pages.** Render now only hosts the
database and the API; `render.yaml` reflects this (the old
`shruhi-portal-frontend` static site is no longer in it).

### One-time cleanup if you already deployed the old Render frontend
In the Render dashboard, open `shruhi-portal-frontend` (if it still exists)
→ Settings → **Delete Service**. It's no longer created by the blueprint, so
leaving it around just wastes your one free static-site slot.

### A. Render (database + API) — same as before
1. Push this repo to GitHub (see below if not done yet).
2. Render → **New +** → **Blueprint** → select the repo → Apply. This
   (re)creates `shruhi-portal-db` and `shruhi-portal-api` only.
3. Once `shruhi-portal-api` is Live, set these in its **Environment** tab if
   you want the admin account auto-created on boot (no Shell needed —
   migrations and the admin seed both run automatically on every startup):
   - `ADMIN_EMAIL` — required to trigger auto-seed
   - `ADMIN_NAME` — optional, defaults to "Admin"
   - `ADMIN_PASSWORD` — optional; if omitted, a temporary one is generated
     and printed once to the **Logs** tab
4. Copy the API's live URL (e.g. `https://shruhi-portal-api.onrender.com`) —
   you need it for step B.

### B. GitHub Pages (frontend)
1. **Push this repo to GitHub** (same as before):
   ```bash
   git add .
   git commit -m "Redesign UI, move frontend hosting to GitHub Pages"
   git push
   ```
2. In your GitHub repo: **Settings → Pages** → under "Build and deployment,"
   set **Source** to **GitHub Actions**.
3. Still in Settings: **Secrets and variables → Actions → Variables tab →
   New repository variable**:
   - Name: `VITE_API_BASE`
   - Value: the Render API URL from step A4 (no trailing slash)
4. Go to the **Actions** tab in GitHub — pushing to `main` automatically
   triggers the "Deploy frontend to GitHub Pages" workflow. Wait for it to
   finish (green check).
5. Your site is now live at:
   ```
   https://<your-github-username>.github.io/shruhi-proposal-portal/
   ```
   (Also shown under Settings → Pages once the first deploy completes.)

Every future push to `main` that touches `frontend/` re-triggers this
workflow automatically — no manual redeploy needed.

**Note on routing:** the app uses `HashRouter` (URLs look like
`.../#/cases`), not `BrowserRouter` — this is deliberate. GitHub Pages is a
plain static file host with no server-side rewrite support, so a plain
`BrowserRouter` route like `/cases` would 404 on refresh. Hash-based routing
sidesteps that entirely and needs no extra configuration.

---

## 3. Repo structure

```
shruhi-portal/
  .github/workflows/
    deploy-pages.yml      # builds + deploys frontend to GitHub Pages on push
  backend/
    src/
      server.js           # express app entrypoint — auto-runs migrations + admin seed on boot
      migrate.js           # shared migration logic (used by server.js and scripts/migrate.js)
      seedAdmin.js         # shared admin-seed logic (used by server.js and scripts/seedAdmin.js)
      db.js                # pg pool
      routes/
        auth.js            # POST /api/auth/login
        cases.js            # case CRUD + stage transitions
      middleware/
        auth.js             # JWT verification, role guard
      migrations/
        001_init.sql        # full schema
    scripts/
      migrate.js           # CLI wrapper (local dev)
      seedAdmin.js         # CLI wrapper (local dev)
  frontend/
    src/
      pages/
        Login.jsx
        Cases.jsx
      components/
        TopBar.jsx
      styles.css           # design tokens (color, type, shared classes)
      api.js               # fetch wrapper
      App.jsx / main.jsx    # HashRouter — required for GitHub Pages
    vite.config.js         # sets /shruhi-proposal-portal/ base when building for Pages
  render.yaml              # Render blueprint — database + API only
```

---

## 4. Next milestone

Costing tab: catalog-assisted (decoder) + manual line-item entry, both
writing to the `costing_items` table already in place. Say go whenever
you're ready and I'll pick that up.
