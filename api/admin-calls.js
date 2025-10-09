// api/admin-calls.js
// GET recent calls from Supabase (public.demo_calls)
// Auth: Authorization: Bearer ADMIN_DASH_TOKEN

export default async function handler(req, res) {
  try {
    // ---- Auth ----
    const adminHeader = req.headers.authorization || "";
    const token = adminHeader.startsWith("Bearer ")
      ? adminHeader.slice("Bearer ".length).trim()
      : "";
    if (!token || token !== process.env.ADMIN_DASH_TOKEN) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    // ---- Config ----
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ ok: false, error: "missing supabase env" });
    }

    // ---- Query Supabase REST (PostgREST) ----
    // Returns the columns your admin UI expects
    const url =
      `${SUPABASE_URL}/rest/v1/demo_calls` +
      `?select=created_at,company,email,phone_e164,country,status,tw_sid` +
      `&order=created_at.desc` +
      `&limit=500`;

    const r = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE,
        authorization: `Bearer ${SERVICE_ROLE}`,
        accept: "application/json",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ ok: false, error: "supabase_error", detail: text });
    }

    const rows = await r.json();

    // Map `created_at` to `ts` (what your admin UI uses)
    const mapped = rows.map((x) => ({
      ts: x.created_at,
      company: x.company,
      email: x.email,
      phone_e164: x.phone_e164,
      country: x.country,
      status: x.status,
      tw_sid: x.tw_sid,
    }));

    return res.status(200).json({ ok: true, rows: mapped });
  } catch (err) {
    console.error("admin-calls error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
