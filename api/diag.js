// api/diag.js — sanity check what's running in Production
module.exports = async function (req, res) {
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim()
           || (req.socket && req.socket.remoteAddress) || 'unknown';
  const country = (req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '').toString().toUpperCase() || 'XX';
  const allowIps = (process.env.ALLOWLIST_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowlisted = allowIps.includes(ip);

  res.json({
    ok: true,
    runtime: 'make sure this comes from Production',
    ip, country,
    allowlist_env: process.env.ALLOWLIST_IPS || '(empty)',
    allowlisted,
    supabase_url_present: Boolean(process.env.SUPABASE_URL),
    service_role_present: Boolean(process.env.SUPABASE_SERVICE_ROLE),
    admin_token_present: Boolean(process.env.ADMIN_DASH_TOKEN),
    twilio_fn_present: Boolean(process.env.TWILIO_MAKE_CALL),
    reelo_secret_present: Boolean(process.env.REELO_SECRET),
    node: process.version
  });
};
