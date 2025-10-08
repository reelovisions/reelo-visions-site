/**
 * /api/make-demo
 * - Accepts JSON: { to | phone | phone_e164, email?, company?, mode? }
 * - Normalizes phone to E.164
 * - Dials Twilio -> /api/outbound-greet
 * - Best-effort logs to Supabase public.demo_calls
 * - Returns explicit JSON errors (never silent 500)
 */

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    try {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data || ""));
      req.on("error", reject);
    } catch (e) { reject(e); }
  });
}

function normalizeE164(input) {
  if (!input) return "";
  let s = String(input).trim();
  const plus = s.startsWith("+");
  s = s.replace(/[^\d]/g, ""); // keep digits only
  if (plus && s) return "+" + s;
  if (s.length === 11 && s.startsWith("1")) return "+" + s;
  if (s.length === 10) return "+1" + s;
  return s ? "+" + s : "";
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj && obj[k] != null) out[k] = obj[k];
  return out;
}

export default async function handler(req, res) {
  try {
    // preflight
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      return res.status(200).end();
    }
    if (req.method !== "POST") {
      return res.status(405).json({ ok:false, error:"Method Not Allowed" });
    }

    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_CALLER_ID,     // your outbound demo number (from:)
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE
    } = process.env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(500).json({ ok:false, error:"twilio env missing" });
    }

    // read raw JSON body (don’t assume framework parsing)
    let body = {};
    try {
      const raw = await readRawBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    const rawTo = body.to || body.phone || body.phone_e164;
    const to = normalizeE164(rawTo);
    const email = (body.email || "").trim();
    const company = (body.company || "").trim();
    const mode = (body.mode || "press-1-gate");

    if (!to) {
      return res.status(400).json({ ok:false, error:"missing phone (to|phone|phone_e164)" });
    }

    const from = normalizeE164(TWILIO_CALLER_ID || "+16127122959"); // default to your 612 demo line
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host  = req.headers["x-forwarded-host"] || req.headers.host;
    const greetUrl = `${proto}://${host}/api/outbound-greet`;

    // Twilio: create call
    const twUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const enc = new URLSearchParams({ To: to, From: from, Url: greetUrl });
    let tw;
    try {
      const r = await fetch(twUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        },
        body: enc.toString(),
      });
      const txt = await r.text();
      if (!r.ok) {
        return res.status(502).json({ ok:false, error:`twilio ${r.status}`, detail: txt.slice(0, 600) });
      }
      tw = JSON.parse(txt);
    } catch (e) {
      return res.status(502).json({ ok:false, error:"twilio fetch error", detail:String(e) });
    }

    // best-effort: log to Supabase
    try {
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
        const payload = {
          phone_e164: to,
          email, company,
          status: tw.status || "queued",
          tw_sid: tw.sid || null,
          meta: pick({ mode, from, url: greetUrl }, ["mode","from","url"])
        };
        await fetch(`${SUPABASE_URL}/rest/v1/demo_calls`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            "Content-Type": "application/json",
            "Accept-Profile": "public",
            "Content-Profile": "public",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(payload),
        }).catch(()=>{});
      }
    } catch (_) {}

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      ok: true,
      sid: tw.sid,
      status: tw.status || "queued",
      to, from
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error:"unhandled", detail:String(e) });
  }
}
