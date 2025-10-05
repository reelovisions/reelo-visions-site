/**
 * POST /api/demo-call
 * Body: { "phone": "612-840-6268" }  // any US format; we'll normalize
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, error: 'missing phone' });

    // Normalize to +1XXXXXXXXXX
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length < 10) return res.status(400).json({ ok: false, error: 'need 10 digits' });
    const to = '+1' + digits.slice(-10);

    const TWILIO_DEMO_DOMAIN = process.env.TWILIO_DEMO_DOMAIN;
    const REELO_SECRET       = process.env.REELO_SECRET;

    if (!TWILIO_DEMO_DOMAIN || !REELO_SECRET) {
      return res.status(500).json({ ok: false, error: 'server env missing' });
    }

    // Forward to your Twilio Function
    const url = `${TWILIO_DEMO_DOMAIN.replace(/\/$/, '')}/reelo-make-call`;
    const body = new URLSearchParams({ to, secret: REELO_SECRET });

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      // Bubble up Twilio error/status
      return res.status(r.status).json({ ok: false, error: data.error || r.statusText || 'twilio error' });
    }

    return res.status(200).json({ ok: true, ...data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'server error' });
  }
};
