export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'Missing "to"' });

    // Normalize to US E.164 (+1XXXXXXXXXX)
    const digits = String(to).replace(/\D+/g, '');
    let e164;
    if (digits.length === 10) e164 = +1;
    else if (digits.length === 11 && digits.startsWith('1')) e164 = +;
    else return res.status(400).json({ ok: false, error: 'Enter a valid US number (10 digits).' });

    const domain = process.env.TWILIO_DEMO_DOMAIN; // e.g. https://reelo-demo-service-2156.twil.io
    const secret = process.env.REELO_SECRET;       // e.g. RV-DEMO-2025-10-06
    if (!domain || !secret) {
      return res.status(500).json({ ok: false, error: 'Server missing Twilio config.' });
    }

    const r = await fetch(${domain}/reelo-make-call, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: e164, secret }),
    });

    const text = await r.text().catch(() => '');
    if (!r.ok) return res.status(r.status).json({ ok: false, error: text || r.statusText });

    let data = {};
    try { data = JSON.parse(text); } catch {}
    return res.status(200).json({ ok: true, ...data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Server error' });
  }
}
