// api/make-demo.js — US/CA E.164 validation + rate limiting (IP, phone, global)
// Notes:
// - In-memory counters persist per serverless instance only (fine for demos).
// - You can bypass limits by setting ALLOWLIST_IPS to a comma-separated list.
//   e.g., ALLOWLIST_IPS="127.0.0.1,::1,203.0.113.42"

const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;

// ---- Policy
const LIMITS = {
  perIp: { max: 3, window: ONE_HOUR },
  perPhoneBurst: { minGapMs: 30 * ONE_MIN }, // 1 call / 30m
  perPhoneDaily: { max: 5, window: ONE_DAY },
  globalDaily: { max: 200, window: ONE_DAY },
};

// ---- In-memory stores (per instance)
const ipHits = new Map();      // ip -> [timestamps]
const phoneHits = new Map();   // +E164 -> [timestamps]
let globalHits = [];           // [timestamps]

// ---- Helpers (rate limit)
function now() { return Date.now(); }

function prune(list, windowMs) {
  const cutoff = now() - windowMs;
  // list is ascending; drop old
  while (list.length && list[0] < cutoff) list.shift();
  return list;
}

function recordHit(map, key) {
  const arr = map.get(key) || [];
  arr.push(now());
  map.set(key, arr);
  return arr;
}

function getClientIp(req) {
  // Try x-forwarded-for first (Vercel), then socket
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isAllowlisted(ip) {
  const raw = process.env.ALLOWLIST_IPS;
  if (!raw) return false;
  return raw.split(',').map(s => s.trim()).filter(Boolean).includes(ip);
}

// ---- Phone normalization (US/CA only)
function normalizeUS(input) {
  const digits = String(input).replace(/\D+/g, '');
  if (digits.length === 10) return { ok: true, e164: '+1' + digits };
  if (digits.length === 11 && digits.startsWith('1')) return { ok: true, e164: '+' + digits };
  if (/^\+1\d{10}$/.test(String(input).trim())) return { ok: true, e164: String(input).trim() };
  return { ok: false, error: 'Only US/CA numbers are allowed (must be +1 followed by 10 digits).' };
}

// ---- Send Twilio Function as x-www-form-urlencoded
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

  try {
    const ip = getClientIp(req);
    const allowlisted = isAllowlisted(ip);

    const { phone: rawPhone, email, company } = req.body || {};
    if (!rawPhone) return res.status(400).json({ ok: false, error: 'missing phone' });

    // ---- Normalize & validate phone
    const norm = normalizeUS(rawPhone);
    if (!norm.ok) {
      return res.status(400).json({ ok: false, error: norm.error, hint: 'Use +1XXXXXXXXXX (e.g., +16128406268).' });
    }
    const phone = norm.e164;

    // ---- Env config
    const SECRET = process.env.REELO_SECRET;
    const TWILIO_FN_URL = process.env.TWILIO_MAKE_CALL;
    if (!SECRET || !TWILIO_FN_URL) {
      return res.status(500).json({ ok: false, error: 'server not configured' });
    }

    // ---- Rate limiting (skip if allowlisted)
    if (!allowlisted) {
      // Global daily cap
      globalHits = prune(globalHits, LIMITS.globalDaily.window);
      if (globalHits.length >= LIMITS.globalDaily.max) {
        res.setHeader('Retry-After', Math.ceil(LIMITS.globalDaily.window / 1000));
        return res.status(429).json({ ok: false, error: 'daily call limit reached', scope: 'global', limit: LIMITS.globalDaily.max });
      }

      // Per-IP (3 / hour)
      const ipArr = prune(ipHits.get(ip) || [], LIMITS.perIp.window);
      if (ipArr.length >= LIMITS.perIp.max) {
        const retrySec = Math.ceil((ipArr[0] + LIMITS.perIp.window - now()) / 1000);
        res.setHeader('Retry-After', Math.max(1, retrySec));
        return res.status(429).json({ ok: false, error: 'too many requests from this IP', scope: 'ip', limit: LIMITS.perIp.max, windowSec: LIMITS.perIp.window / 1000 });
      }

      // Per-phone: 1 / 30min + 5 / day
      const pArr = phoneHits.get(phone) || [];
      prune(pArr, LIMITS.perPhoneDaily.window);
      if (pArr.length >= LIMITS.perPhoneDaily.max) {
        const first = pArr[0];
        const retrySec = Math.ceil((first + LIMITS.perPhoneDaily.window - now()) / 1000);
        res.setHeader('Retry-After', Math.max(1, retrySec));
        return res.status(429).json({ ok: false, error: 'daily call limit for this number reached', scope: 'phone', limit: LIMITS.perPhoneDaily.max, windowSec: LIMITS.perPhoneDaily.window / 1000 });
      }
      if (pArr.length) {
        const last = pArr[pArr.length - 1];
        const gap = now() - last;
        if (gap < LIMITS.perPhoneBurst.minGapMs) {
          const retrySec = Math.ceil((LIMITS.perPhoneBurst.minGapMs - gap) / 1000);
          res.setHeader('Retry-After', Math.max(1, retrySec));
          return res.status(429).json({ ok: false, error: 'please wait before calling this number again', scope: 'phone', minGapSec: LIMITS.perPhoneBurst.minGapMs / 1000, retryAfterSec: retrySec });
        }
      }

      // If we pass all checks, record provisional hits (we'll keep them even if Twilio rejects to avoid hammering)
      globalHits.push(now());
      ipArr.push(now()); ipHits.set(ip, ipArr);
      pArr.push(now()); phoneHits.set(phone, pArr);
    }

    // ---- Forward to Twilio Function
    const tw = await callTwilioFn({ secret: SECRET, url: TWILIO_FN_URL, phone, email, company });
    if (!tw.ok) {
      return res.status(tw.status || 502).json({ ok: false, error: (tw.data && (tw.data.error || tw.data.message)) || 'twilio function error' });
    }

    return res.status(200).json({ ok: true, ...(typeof tw.data === 'object' ? tw.data : { message: String(tw.data) }) });

  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
};
