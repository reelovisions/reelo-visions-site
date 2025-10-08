// api/make-demo.js — validation + geo-allowlist + rate limits + Supabase logging + Twilio forward (logs full phone)

const crypto = require('crypto');

const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;

const LIMITS = {
  perIp: { max: 3, window: ONE_HOUR },
  perPhoneBurst: { minGapMs: 30 * ONE_MIN }, // 1 per 30m
  perPhoneDaily: { max: 5, window: ONE_DAY },
  globalDaily: { max: 200, window: ONE_DAY },
};

// in-memory (per lambda instance)
const ipHits = new Map();
const phoneHits = new Map();
let globalHits = [];

function now() { return Date.now(); }
function prune(list, windowMs) {
  const cutoff = now() - windowMs;
  while (list.length && list[0] < cutoff) list.shift();
  return list;
}
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}
function getCountry(req) {
  const h1 = req.headers['x-vercel-ip-country'];
  const h2 = req.headers['cf-ipcountry'];
  const c = (h1 || h2 || '').toString().trim().toUpperCase();
  return c || 'XX';
}
function isAllowlisted(ip) {
  const raw = process.env.ALLOWLIST_IPS;
  if (!raw) return false;
  return raw.split(',').map(s => s.trim()).filter(Boolean).includes(ip);
}
function isCountryAllowed(req) {
  const raw = (process.env.ALLOW_COUNTRIES || 'US,CA')
    .split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const c = getCountry(req);
  return raw.includes(c);
}
function normalizeUS(input) {
  const digits = String(input).replace(/\D+/g, '');
  if (digits.length === 10) return { ok: true, e164: '+1' + digits };
  if (digits.length === 11 && digits.startsWith('1')) return { ok: true, e164: '+' + digits };
  if (/^\+1\d{10}$/.test(String(input).trim())) return { ok: true, e164: String(input).trim() };
  return { ok: false, error: 'Only US/CA numbers are allowed (must be +1 followed by 10 digits).' };
}
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

async function logToSupabase(row) {
  try {
    const base = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    const key  = process.env.SUPABASE_SERVICE_ROLE || '';
    if (!base || !key) return;
    await fetch(`${base}/rest/v1/demo_calls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Profile': 'public',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify([row]),
    }).then(r => r.text()).catch(() => {});
  } catch (_) {}
}

async function callTwilioFn({ secret, url, phone, email, company }) {
  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('to', phone);
  if (email) form.set('email', String(email));
  if (company) form.set('company', String(company));
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
  return { ok: r.ok && !(data && data.ok === false), status: r.status, data };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const ip = getClientIp(req);
  const country = getCountry(req);
  const ua = req.headers['user-agent'] || '';
  const allowlisted = isAllowlisted(ip);

  async function send(status, body, log) {
    const row = {
      ts: new Date().toISOString(),
      ip, country, user_agent: ua,
      phone_hash: log?.phone_hash ?? null,
      phone_last4: log?.phone_last4 ?? null,
      phone_e164: log?.phone_e164 ?? null,   // NEW: store full phone
      email: log?.email ?? null,
      company: log?.company ?? null,
      status: log?.status ?? 'error',
      error: log?.error ?? null,
      tw_sid: log?.tw_sid ?? null,
      rl_scope: log?.rl_scope ?? null,
      rl_retry_after_seconds: log?.rl_retry_after_seconds ?? null,
    };
    logToSupabase(row);
    return res.status(status).json(body);
  }

  try {
    const { phone: rawPhone, email, company } = req.body || {};
    if (!rawPhone) {
      return send(400, { ok: false, error: 'missing phone' }, { status: 'bad_input' });
    }

    if (!allowlisted && !isCountryAllowed(req)) {
      return send(403,
        { ok: false, error: 'geo blocked', hint: 'Only US/CA are allowed for this demo.', country },
        { status: 'error', error: 'geo_blocked' }
      );
    }

    const norm = normalizeUS(rawPhone);
    if (!norm.ok) {
      return send(400,
        { ok: false, error: norm.error, hint: 'Use +1XXXXXXXXXX (e.g., +16128406268).' },
        { status: 'bad_input', error: 'invalid_phone' }
      );
    }
    const phone = norm.e164;
    const phone_hash = sha256(phone);
    const phone_last4 = phone.slice(-4);

    const SECRET = process.env.REELO_SECRET;
    const TWILIO_FN_URL = process.env.TWILIO_MAKE_CALL;
    if (!SECRET || !TWILIO_FN_URL) {
      return send(500, { ok: false, error: 'server not configured' }, {
        status: 'error', error: 'server_misconfig', phone_hash, phone_last4, phone_e164: phone, email, company
      });
    }

    if (!allowlisted) {
      globalHits = prune(globalHits, LIMITS.globalDaily.window);
      if (globalHits.length >= LIMITS.globalDaily.max) {
        const retry = Math.ceil(LIMITS.globalDaily.window / 1000);
        return send(429,
          { ok: false, error: 'daily call limit reached', scope: 'global', limit: LIMITS.globalDaily.max },
          { status: 'rate_limited', rl_scope: 'global', rl_retry_after_seconds: retry, phone_hash, phone_last4, phone_e164: phone, email, company }
        );
      }
      const ipArr = prune(ipHits.get(ip) || [], LIMITS.perIp.window);
      if (ipArr.length >= LIMITS.perIp.max) {
        const retry = Math.ceil((ipArr[0] + LIMITS.perIp.window - now()) / 1000);
        return send(429,
          { ok: false, error: 'too many requests from this IP', scope: 'ip', limit: LIMITS.perIp.max, windowSec: LIMITS.perIp.window / 1000 },
          { status: 'rate_limited', rl_scope: 'ip', rl_retry_after_seconds: Math.max(1, retry), phone_hash, phone_last4, phone_e164: phone, email, company }
        );
      }
      const pArr = phoneHits.get(phone) || [];
      prune(pArr, LIMITS.perPhoneDaily.window);
      if (pArr.length >= LIMITS.perPhoneDaily.max) {
        const first = pArr[0];
        const retry = Math.ceil((first + LIMITS.perPhoneDaily.window - now()) / 1000);
        return send(429,
          { ok: false, error: 'daily call limit for this number reached', scope: 'phone', limit: LIMITS.perPhoneDaily.max, windowSec: LIMITS.perPhoneDaily.window / 1000 },
          { status: 'rate_limited', rl_scope: 'phone_daily', rl_retry_after_seconds: Math.max(1, retry), phone_hash, phone_last4, phone_e164: phone, email, company }
        );
      }
      if (pArr.length) {
        const last = pArr[pArr.length - 1];
        const gap = now() - last;
        if (gap < LIMITS.perPhoneBurst.minGapMs) {
          const retry = Math.ceil((LIMITS.perPhoneBurst.minGapMs - gap) / 1000);
          return send(429,
            { ok: false, error: 'please wait before calling this number again', scope: 'phone', minGapSec: LIMITS.perPhoneBurst.minGapMs / 1000, retryAfterSec: retry },
            { status: 'rate_limited', rl_scope: 'phone_gap', rl_retry_after_seconds: Math.max(1, retry), phone_hash, phone_last4, phone_e164: phone, email, company }
          );
        }
      }
      // record hits
      globalHits.push(now());
      ipArr.push(now()); ipHits.set(ip, ipArr);
      const pArr2 = phoneHits.get(phone) || [];
      pArr2.push(now()); phoneHits.set(phone, pArr2);
    }

    const tw = await callTwilioFn({ secret: SECRET, url: TWILIO_FN_URL, phone, email, company });
    if (!tw.ok) {
      return send(tw.status || 502,
        { ok: false, error: (tw.data && (tw.data.error || tw.data.message)) || 'twilio function error' },
        { status: 'error', error: (tw.data && (tw.data.error || tw.data.message)) || 'twilio function error',
          phone_hash, phone_last4, phone_e164: phone, email, company }
      );
    }

    const sid = (tw.data && (tw.data.sid || tw.data.Sid)) || null;
    return send(200,
      { ok: true, ...(typeof tw.data === 'object' ? tw.data : { message: String(tw.data) }) },
      { status: 'ok', tw_sid: sid, phone_hash, phone_last4, phone_e164: phone, email, company }
    );

  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
