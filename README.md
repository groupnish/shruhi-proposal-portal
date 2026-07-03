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

## 2. Deploying to Render + GitHub

1. **Push this repo to GitHub.**
   ```bash
   git init
   git add .
   git commit -m "Milestone 1: auth + case entry skeleton"
   git remote add origin <your-new-github-repo-url>
   git push -u origin main
   ```

2. **In Render:** New → Blueprint → connect the GitHub repo. Render reads
   `render.yaml` and provisions three things automatically:
   - `shruhi-portal-db` (Postgres)
   - `shruhi-portal-api` (backend web service)
   - `shruhi-portal-frontend` (static site)

3. **Run the migration once, against the live database.** Easiest way: open
   a shell on the `shruhi-portal-api` service in the Render dashboard and run:
   ```bash
   npm run migrate
   npm run seed:admin -- --name "Manan" --email manan@shruhi.com
   ```
   Save the printed temporary password — change it after first login (a
   "change password" endpoint isn't built yet; for now, re-run `seed:admin`
   with `--password` to reset it if needed).

4. **Note on `VITE_API_BASE`:** the frontend is a static site and the backend
   is a separate service, so the frontend needs to know the backend's live
   URL at build time. `render.yaml` attempts to wire this automatically; if
   your Render account's blueprint version doesn't support `fromService` for
   static sites, just hardcode the API's `https://shruhi-portal-api.onrender.com`
   URL into `VITE_API_BASE` in the frontend service's environment settings
   after the first deploy, then trigger a redeploy.

5. Every subsequent `git push` to `main` auto-deploys both services.

---

## 3. Repo structure

```
shruhi-portal/
  backend/
    src/
      server.js           # express app entrypoint
      db.js                # pg pool
      routes/
        auth.js            # POST /api/auth/login
        cases.js            # case CRUD + stage transitions
      middleware/
        auth.js             # JWT verification, role guard
      migrations/
        001_init.sql        # full schema
    scripts/
      migrate.js           # runs migrations
      seedAdmin.js         # creates/updates the Admin user
  frontend/
    src/
      pages/
        Login.jsx
        Cases.jsx
      api.js               # fetch wrapper
      App.jsx / main.jsx
  render.yaml              # Render blueprint (db + api + static site)
```

---

## 4. Next milestone

Costing tab: catalog-assisted (decoder) + manual line-item entry, both
writing to the `costing_items` table already in place. Say go whenever
you're ready and I'll pick that up.
