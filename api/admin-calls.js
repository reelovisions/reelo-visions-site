// api/admin-calls.js - secure read of recent demo calls with full phone
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (req.query.token || '');
  if (!token || token !== process.env.ADMIN_DASH_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key  = process.env.SUPABASE_SERVICE_ROLE || '';
  if (!base || !key) return res.status(500).json({ ok: false, error: 'server not configured' });

  // include full phone
  const url = `${base}/rest/v1/demo_calls?select=ts,country,company,email,phone_e164,status,tw_sid&order=ts.desc&limit=500`;
  const r = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const data = await r.json().catch(() => []);
  return res.status(r.ok ? 200 : r.status).json({ ok: r.ok, rows: Array.isArray(data) ? data : [] });
}
