export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SRV = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SRV) return res.status(500).json({ error: "Supabase env not configured" });

  try {
    const body = await parseJson(req);

    // Map rating text -> int (fallback 0)
    const ratingMap = { "Great demo": 5, "Okay": 3, "Confusing": 1, "Didn't work": 1 };
    const ratingInt = ratingMap[String(body.rating || "").trim()] ?? 0;

    // Normalize phone (best-effort US)
    const rawPhone = String(body.phone || "").trim();
    let phone_e164 = rawPhone;
    if (rawPhone && !rawPhone.startsWith("+")) {
      const digits = rawPhone.replace(/\D/g, "");
      if (digits.length === 10) phone_e164 = "+1" + digits;
      else if (digits.length > 0) phone_e164 = "+" + digits;
    }

    const ip =
      (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() ||
      (req.socket && req.socket.remoteAddress) ||
      null;

    const row = {
      phone_e164,
      rating: ratingInt,
      reason: String(body.call_result || "").slice(0, 256),
      notes: JSON.stringify({
        comments: String(body.comments || "").slice(0, 4000),
        email: String(body.email || "").slice(0, 256),
        company: String(body.company || "").slice(0, 256),
        url: String(body.url || "").slice(0, 1024)
      }),
      ip,
      user_agent: String(body.user_agent || "").slice(0, 1024)
    };

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/demo_feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SRV,
        "Authorization": `Bearer ${SRV}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify([row])
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(500).json({ error: "Supabase insert failed", detail: txt });
    }

    const data = await resp.json();
    return res.status(200).json({ ok: true, id: data?.[0]?.id ?? null });
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON", detail: e?.message });
  }
}

async function parseJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch (e) { reject(e); }
    });
  });
}
