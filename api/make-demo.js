// api/make-demo.js (CommonJS)
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { phone, email, company } = req.body || {};
    if (!phone) return res.status(400).json({ ok: false, error: 'missing phone' });

    const SECRET = process.env.REELO_SECRET;            // set in Vercel (Production)
    const TWILIO_FN_URL = process.env.TWILIO_MAKE_CALL; // set in Vercel (Production)
    if (!SECRET || !TWILIO_FN_URL) {
      return res.status(500).json({ ok: false, error: 'server not configured' });
    }

    // Node 18+ has global fetch; if your project runs on Node 16 this would fail.
    const r = await fetch(TWILIO_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: SECRET,
        to: phone,
        email: email || '',
        company: company || ''
      })
    });

    const data = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : r.status).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
