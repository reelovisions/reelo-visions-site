export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }

  try {
    const { to, secret } = req.body || {};
    if (!to)   return res.status(400).json({ ok: false, error: "missing to" });
    if (!secret) return res.status(400).json({ ok: false, error: "missing secret" });

    // Validate secret server-side
    if (secret !== process.env.REELO_SECRET) {
      return res.status(401).json({ ok: false, error: "bad secret" });
    }

    // Forward to your Twilio Function
    const domain = process.env.TWILIO_DEMO_DOMAIN; // e.g. https://reelo-demo-service-2156.twil.io
    const fwd = await fetch(`${domain}/reelo-make-call`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ to, secret }).toString(),
    });

    const data = await fwd.json().catch(() => ({}));
    return res.status(fwd.ok ? 200 : 500).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
