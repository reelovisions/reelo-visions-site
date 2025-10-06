/**
 * Vercel Serverless Function: /api/demo-call
 * Takes {company, email, phone} from the website, injects REELO_SECRET on the server,
 * and forwards to your Twilio Function endpoint. No secrets in the browser.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method not allowed" });
  }

  try {
    // Accept JSON or form posts
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { company, email, phone } = body;

    if (!company || !email || !phone) {
      return res.status(400).json({ ok: false, error: "missing fields: company/email/phone" });
    }

    // Env vars (set in Vercel UI). NEXT_PUBLIC_* can be read on client if needed.
    const TWILIO_FUNCTION_URL = process.env.NEXT_PUBLIC_REELO_DEMO_URL || "https://reelo-demo-service-2156.twil.io/reelo-make-call";
    const REELO_SECRET = (process.env.REELO_SECRET || "").trim();

    if (!REELO_SECRET) {
      return res.status(500).json({ ok: false, error: "server config missing REELO_SECRET" });
    }

    // Forward to Twilio Function with secret in BODY (proven reliable)
    const r = await fetch(TWILIO_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone,
        email,
        company,
        secret: REELO_SECRET
      }),
    });

    const data = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : 400).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: "server error", detail: String(err?.message || err) });
  }
}
