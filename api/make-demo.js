/**
 * /api/make-demo  (dual path)
 * - Accepts JSON: { to | phone | phone_e164, email?, company?, mode? }
 * - Normalizes to E.164
 * - If TWILIO_ACCOUNT_SID/AUTH_TOKEN exist -> call Twilio REST
 * - else if TWILIO_MAKE_CALL & REELO_SECRET exist -> call your proxy
 * - Logs to Supabase (best effort)
 */
function readRawBody(req){return new Promise((res,rej)=>{let d="";req.setEncoding("utf8");req.on("data",c=>d+=c);req.on("end",()=>res(d||""));req.on("error",rej);});}
function e164(s){if(!s)return"";s=String(s).trim();const plus=s.startsWith("+");s=s.replace(/[^\d]/g,"");if(plus&&s)return"+"+s;if(s.length===11&&s.startsWith("1"))return"+"+s;if(s.length===10)return"+1"+s;return s?("+"+s):"";}
function pick(o,ks){const r={};ks.forEach(k=>{if(o&&o[k]!=null)r[k]=o[k]});return r;}

export default async function handler(req,res){
  try{
    if(req.method==="OPTIONS"){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");return res.status(200).end();}
    if(req.method!=="POST") return res.status(405).json({ok:false,error:"Method Not Allowed"});

    const {
      TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_CALLER_ID,
      TWILIO_MAKE_CALL, REELO_SECRET,
      SUPABASE_URL, SUPABASE_SERVICE_ROLE
    } = process.env;

    let body={}; try{const raw=await readRawBody(req); body = raw?JSON.parse(raw):{};}catch{ body={}; }
    const rawTo = body.to || body.phone || body.phone_e164;
    const to = e164(rawTo);
    const email = (body.email||"").trim();
    const company = (body.company||"").trim();
    const mode = (body.mode||"press-1-gate");

    if(!to) return res.status(400).json({ok:false,error:"missing phone (to|phone|phone_e164)"});

    const from = e164(TWILIO_CALLER_ID || "+16127122959"); // your 612 demo line
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host  = req.headers["x-forwarded-host"] || req.headers.host;
    const greetUrl = `${proto}://${host}/api/outbound-greet`;

    let tw = null;

    // Path A: direct Twilio REST if creds present
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      const twUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
      const enc = new URLSearchParams({ To: to, From: from, Url: greetUrl });
      const r = await fetch(twUrl, {
        method:"POST",
        headers:{
          "Content-Type":"application/x-www-form-urlencoded",
          "Authorization":"Basic "+Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")
        },
        body: enc.toString()
      });
      const txt = await r.text();
      if(!r.ok) return res.status(502).json({ok:false,error:`twilio ${r.status}`,detail:txt.slice(0,600)});
      tw = JSON.parse(txt);
    }
    // Path B: your existing proxy (preferred when Twilio creds not set)
    else if (TWILIO_MAKE_CALL && REELO_SECRET) {
      const payload = { to, from, url: greetUrl, meta: { email, company, mode } };
      const r = await fetch(TWILIO_MAKE_CALL, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-reelo-secret": REELO_SECRET },
        body: JSON.stringify(payload)
      });
      const txt = await r.text();
      if(!r.ok) return res.status(502).json({ok:false,error:`proxy ${r.status}`,detail:txt.slice(0,600)});
      // assume proxy returns { sid, status? }
      try { tw = JSON.parse(txt); } catch { tw = { sid: null, status: "queued" }; }
    }
    else {
      return res.status(500).json({ok:false,error:"no dial path: set TWILIO_ACCOUNT_SID/AUTH_TOKEN or TWILIO_MAKE_CALL/REELO_SECRET"});
    }

    // best-effort log to Supabase
    try{
      if(SUPABASE_URL && SUPABASE_SERVICE_ROLE){
        const log = {
          phone_e164: to, email, company,
          status: (tw && tw.status) || "queued",
          tw_sid: (tw && tw.sid) || null,
          meta: pick({ mode, from, url: greetUrl }, ["mode","from","url"])
        };
        await fetch(`${SUPABASE_URL}/rest/v1/demo_calls`,{
          method:"POST",
          headers:{
            apikey: SUPABASE_SERVICE_ROLE,
            Authorization:`Bearer ${SUPABASE_SERVICE_ROLE}`,
            "Content-Type":"application/json",
            "Accept-Profile":"public",
            "Content-Profile":"public",
            Prefer:"return=minimal"
          },
          body: JSON.stringify(log)
        }).catch(()=>{});
      }
    }catch(_) {}

    res.setHeader("Access-Control-Allow-Origin","*");
    return res.status(200).json({ ok:true, sid: tw?.sid || null, status: tw?.status || "queued", to, from });
  }catch(e){
    return res.status(500).json({ ok:false, error:"unhandled", detail:String(e) });
  }
}
