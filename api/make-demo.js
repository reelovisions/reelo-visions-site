// api/make-demo.js — with US/CA E.164 validation
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { phone: rawPhone, email, company } = req.body || {};
    if (!rawPhone) return res.status(400).json({ ok: false, error: 'missing phone' });

    // ---- Normalize & validate (US/CA only)
    const normalized = normalizeUS(rawPhone);
    if (!normalized.ok) {
      return res.status(400).json({
        ok: false,
        error: normalized.error || 'invalid phone',
        hint: 'Use a US/CA number like +16128406268 (E.164).'
      });
    }
    const phone = normalized.e164; // guaranteed like +1XXXXXXXXXX

    // ---- Env
    const SECRET = process.env.REELO_SECRET;
    const TWILIO_FN_URL = process.env.TWILIO_MAKE_CALL;
    if (!SECRET || !TWILIO_FN_URL) {
      return res.status(500).json({ ok: false, error: 'server not configured' });
    }

    // ---- Forward to Twilio Function as form-encoded (what TF expects)
    const form = new URLSearchParams();
    form.set('secret', SECRET);
    form.set('to', phone);
    if (email) form.set('email', String(email));
    if (company) form.set('company', String(company));

    const r = await fetch(TWILIO_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!r.ok || (data && data.ok === false)) {
      return res.status(r.status).json({ ok: false, ...(typeof data === 'object' ? data : { error: String(data) }) });
    }
    return res.status(200).json({ ok: true, ...(typeof data === 'object' ? data : { message: String(data) }) });

  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};

// Helpers
function normalizeUS(input) {
  const digits = String(input).replace(/\D+/g, ''); // keep numbers only
  if (digits.length === 10) {
    // assume US/CA national, add +1
    return { ok: true, e164: '+1' + digits };
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return { ok: true, e164: '+' + digits };
  }
  // already E.164?
  if (/^\+1\d{10}$/.test(String(input).trim())) {
    return { ok: true, e164: String(input).trim() };
  }
  return { ok: false, error: 'Only US/CA numbers are allowed (must be +1 followed by 10 digits).' };
}
