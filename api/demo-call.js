/**
 * POST /api/demo-call
 * Body: { "phone": "612-555-0123" | "+16125550123" , "email": "optional@x.com" }
 * - Normalizes to US +1E.164
 * - Rate limits: 1 call / 60s per phone or IP; 5 per hour cap
 * - Logs to Supabase (demo_call_log)
 * - Proxies to Twilio Function with REELO_SECRET
 */
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  const TWILIO_DEMO_DOMAIN = process.env.TWILIO_DEMO_DOMAIN;
  const REELO_SECRET = process.env.REELO_SECRET;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !TWILIO_DEMO_DOMAIN || !REELO_SECRET) {
    return res.status(500).json({ ok: false, error: 'server env missing' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const { phone, email } = (req.body || {});
    const ip = getIp(req);
    const ua = req.headers['user-agent'] || '';

    const e164 = normalizeUS(phone);
    if (!e164) return res.status(400).json({ ok: false, error: 'need 10-digit US number' });

    // Rate limit windows
    const now = Date.now();
    const since60 = new Date(now - 60 * 1000).toISOString();
    const since1h = new Date(now - 60 * 60 * 1000).toISOString();

    // 1/min per phone OR IP
    const { data: recentMin, error: errMin } = await supabase
      .from('demo_call_log')
      .select('id')
      .gte('created_at', since60)
      .or(`phone_e164.eq.${e164},ip.eq.${ip}`)
      .limit(1);

    if (errMin) throw errMin;
    if ((recentMin?.length || 0) > 0) {
      await supabase.from('demo_call_log').insert({
        phone_e164: e164, email, ip, user_agent: ua, status: 'rate_limited', error: 'cooldown_60s'
      });
      return res.status(429).json({ ok: false, error: 'Please wait ~60 seconds before trying again.' });
    }

    // 5/hour cap
    const { data: recentHr, error: errHr } = await supabase
      .from('demo_call_log')
      .select('id')
      .gte('created_at', since1h)
      .or(`phone_e164.eq.${e164},ip.eq.${ip}`);

    if (errHr) throw errHr;
    if ((recentHr?.length || 0) >= 5) {
      await supabase.from('demo_call_log').insert({
        phone_e164: e164, email, ip, user_agent: ua, status: 'rate_limited', error: 'cap_1h'
      });
      return res.status(429).json({ ok: false, error: 'Hourly demo limit reached. Please try again later.' });
    }

    // Log attempt (queued)
    const { data: inserted, error: insErr } = await supabase
      .from('demo_call_log')
      .insert([{ phone_e164: e164, email, ip, user_agent: ua, status: 'queued' }])
      .select('id')
      .single();

    if (insErr) throw insErr;
    const rowId = inserted?.id;

    // Proxy to Twilio Function
    const url = `${TWILIO_DEMO_DOMAIN.replace(/\/$/,'')}/reelo-make-call`;
    const fwd = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: e164, secret: REELO_SECRET }).toString()
    });

    const body = await fwd.json().catch(() => ({}));

    if (!fwd.ok || body?.ok === false) {
      const msg = body?.error || `Twilio error ${fwd.status}`;
      if (rowId) {
        await supabase.from('demo_call_log')
          .update({ status: 'failed', error: msg })
          .eq('id', rowId);
      }
      return res.status(502).json({ ok: false, error: msg });
    }

    if (rowId) {
      await supabase.from('demo_call_log')
        .update({ status: 'queued', sid: body.sid || null })
        .eq('id', rowId);
    }

    return res.status(200).json({ ok: true, sid: body.sid || null });
  } catch (err) {
    console.error('demo-call server error:', err);
    return res.status(500).json({ ok: false, error: 'server_error' });
  }
};

function normalizeUS(raw) {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  if (d.length === 12 && d.startsWith('+1')) return d;
  return null;
}
function getIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0]?.trim())
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || '0.0.0.0';
}
