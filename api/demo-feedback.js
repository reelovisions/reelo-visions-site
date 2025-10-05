/**
 * POST /api/demo-feedback
 * Body: { phone:"...", rating:1-5, reason:"...", notes:"..." }
 * Validates & inserts into public.demo_feedback via SERVICE_ROLE
 */
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return res.status(500).json({ ok: false, error: 'server env missing' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

  try {
    const { phone, rating, reason, notes } = (req.body || {});
    const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.headers['x-real-ip'] || req.socket?.remoteAddress || '0.0.0.0';
    const ua = req.headers['user-agent'] || '';

    const e164 = normalizeUS(phone);
    if (!e164) return res.status(400).json({ ok: false, error: 'invalid phone' });

    const r = parseInt(rating, 10);
    if (!(r >= 1 && r <= 5)) return res.status(400).json({ ok: false, error: 'rating 1-5 required' });

    const { error } = await supabase.from('demo_feedback').insert([{
      phone_e164: e164,
      rating: r,
      reason: (reason || '').toString().slice(0,80),
      notes: (notes || '').toString().slice(0,2000),
      ip, user_agent: ua
    }]);

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('demo-feedback error:', err);
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
