export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  try {
    const { phone } = req.body || {};
    const e164 = toE164(phone);
    if (!e164) return res.status(400).json({ ok: false, error: "Please enter a valid phone number (US or +E.164)." });

    const domain = process.env.TWILIO_DEMO_DOMAIN;
    const secret = process.env.REEL0_SECRET;
    if (!domain || !secret) return res.status(500).json({ ok: false, error: "Server not configured (missing env vars)." });

    const params = new URLSearchParams({ to: e164, secret });
    const r = await fetch(${domain}/reelo-make-call, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
}
function toE164(input) {
  if (!input) return null;
  const digits = String(input).replace(/[^\d+]/g, "");
  if (/^\+?\d{10,15}$/.test(digits)) {
    if (digits.startsWith("+")) return digits;
    if (digits.length === 10) return +1;
    if (digits.length === 11 && digits.startsWith("1")) return +;
  }
  return null;
}
