// CommonJS serverless function for Vercel
// Sends application/x-www-form-urlencoded so Twilio Function sees event.to, event.email, event.company
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

    // Build form-encoded body so Twilio Function gets event.to, etc.
    const form = new URLSearchParams();
    form.set('secret', SECRET);
    form.set('to', phone);
    if (email) form.set('email', email);
    if (company) form.set('company', company);

    const r = await fetch(TWILIO_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    // Twilio Functions sometimes return text. Try JSON, otherwise text.
    let data;
    const txt = await r.text();
    try { data = JSON.parse(txt); } catch { data = { message: txt }; }

    // Normalize shape
    const payload = typeof data === 'object' ? data : { message: String(data) };
    if (r.ok && payload.ok !== false) {
      return res.status(200).json({ ok: true, ...payload });
    } else {
      return res.status(r.status).json({ ok: false, ...payload });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
