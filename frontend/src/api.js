// Local dev: Vite's dev-server proxy forwards /api to localhost:4000 (see vite.config.js).
// Production: frontend and backend are separate Render services, so the frontend
// build needs to know the backend's real URL — set VITE_API_BASE at build time.
const BASE = (import.meta.env.VITE_API_BASE || "") + "/api";

function authHeaders() {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  login: (email, password) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),

  listCases: () =>
    fetch(`${BASE}/cases`, { headers: authHeaders() }).then(handle),

  getCase: (id) =>
    fetch(`${BASE}/cases/${id}`, { headers: authHeaders() }).then(handle),

  createCase: (payload) =>
    fetch(`${BASE}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(handle),

  updateStage: (id, stage, note) =>
    fetch(`${BASE}/cases/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ stage, note }),
    }).then(handle),

  searchFamilies: (q) =>
    fetch(`${BASE}/catalog/families?q=${encodeURIComponent(q || "")}`, { headers: authHeaders() }).then(handle),

  getFamily: (baseCode) =>
    fetch(`${BASE}/catalog/families/${encodeURIComponent(baseCode)}`, { headers: authHeaders() }).then(handle),

  decodeModel: (code) =>
    fetch(`${BASE}/catalog/decode`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ code }),
    }).then(handle),

  listCosting: (caseId) =>
    fetch(`${BASE}/cases/${caseId}/costing`, { headers: authHeaders() }).then(handle),

  addCosting: (caseId, payload) =>
    fetch(`${BASE}/cases/${caseId}/costing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(handle),

  updateCosting: (id, payload) =>
    fetch(`${BASE}/costing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(handle),

  deleteCosting: (id) =>
    fetch(`${BASE}/costing/${id}`, { method: "DELETE", headers: authHeaders() }).then((r) => {
      if (!r.ok) throw new Error("Failed to delete");
    }),
};
