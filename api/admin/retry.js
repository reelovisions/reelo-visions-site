// api/admin/retry.js
// POST { sid } → look up the row, flag a retry, and try to re-trigger your existing /api/make-demo
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

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    const { sid } = req.body || {};
    if (!sid) {
      return res.status(400).json({ ok: false, error: "missing_sid" });
    }

    // ---- Config ----
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
    const SITE_BASE =
      process.env.SITE_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ ok: false, error: "missing supabase env" });
    }

    // ---- 1) Fetch the original row by SID ----
    const bySidUrl =
      `${SUPABASE_URL}/rest/v1/demo_calls` +
      `?tw_sid=eq.${encodeURIComponent(sid)}` +
      `&select=created_at,company,email,phone_e164,country,status,tw_sid` +
      `&limit=1`;

    const getResp = await fetch(bySidUrl, {
      headers: {
        apikey: SERVICE_ROLE,
        authorization: `Bearer ${SERVICE_ROLE}`,
        accept: "application/json",
      },
    });

    if (!getResp.ok) {
      const detail = await getResp.text();
      return res.status(502).json({ ok: false, error: "supabase_lookup_error", detail });
    }

    const rows = await getResp.json();
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    const row = rows[0];

    // ---- 2) Mark a retry request in Supabase (optional but nice) ----
    // We set status to 'retry_requested'; your existing pipeline can overwrite on success.
    const patchUrl =
      `${SUPABASE_URL}/rest/v1/demo_calls?tw_sid=eq.${encodeURIComponent(sid)}`;
    const patchResp = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE,
        authorization: `Bearer ${SERVICE_ROLE}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ status: "retry_requested" }),
    });
    if (!patchResp.ok) {
      // Not fatal—continue, but report it
      console.warn("retry: status update failed", await patchResp.text());
    }

    // ---- 3) Try to re-trigger your existing outbound flow ----
    // We’ll call your own /api/make-demo handler if SITE_BASE is set.
    // That endpoint already knows how to call Twilio (it was part of your proxy).
    let triggered = false, triggerStatus = 0, triggerBody = "";

    if (SITE_BASE) {
      try {
        const makeDemoUrl = `${SITE_BASE}/api/make-demo`;
        const triggerResp = await fetch(makeDemoUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            phone: row.phone_e164,
            email: row.email,
            company: row.company,
            source: "admin-retry",
            prev_sid: sid
          }),
        });
        triggerStatus = triggerResp.status;
        triggerBody = await triggerResp.text();
        triggered = triggerResp.ok;
      } catch (e) {
        console.warn("retry: trigger failed", e);
      }
    }

    return res.status(200).json({
      ok: true,
      sid,
      triggered,
      triggerStatus,
      triggerBody: triggered ? undefined : triggerBody, // include body only if failed
    });
  } catch (err) {
    console.error("admin-retry error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
