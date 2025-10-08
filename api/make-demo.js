/**
 * /api/make-demo  (dual path, v2)
 * - Accepts JSON: { to | phone | phone_e164, email?, company?, mode? }
 * - If TWILIO_ACCOUNT_SID/AUTH_TOKEN present -> direct Twilio REST
 * - else if TWILIO_MAKE_CALL + REELO_SECRET present -> your proxy
 * - Adds "X-MakeDemo-Impl: dualpath-v2" on all responses (to verify deploy)
 */
function readRawBody(req){return new Promise((res,rej)=>{let d="";req.setEncoding("utf8");req.on("data",c=>d+=c);req.on("end",()=>res(d||""));req.on("error",rej);});}
function e164(s){if(!s)return"";s=String(s).trim();const plus=s.startsWith("+");s=s.replace(/[^\d]/g,"");if(plus&&s)return"+"+s;if(s.length===11&&s.startsWith("1"))return"+"+s;if(s.length===10)return"+1"+s;return s?("+"+s):"";}
function pick(o,ks){const r={};ks.forEach(k=>{if(o&&o[k]!=null)r[k]=o[k]});return r;}

async function reply(res, code, obj){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("X-MakeDemo-Impl","dualpath-v2");
  res.status(code).json(obj);
}

export default async function handler(req,res){
  try{
    if(req.method==="OPTIONS"){
      res.setHeader("Access-Control-Allow-Origin","*");
      res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
      res.setHeader("X-MakeDemo-Impl","dualpath-v2");
      return res.status(200).end();
    }
    if(req.method!=="POST") return reply(res,405,{ok:false,error:"Method Not Allowed"});

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
    if(!to) return reply(res,400,{ok:false,error:"missing phone (to|phone|phone_e164)"});

    const from = e164(TWILIO_CALLER_ID || "+16127122959");
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host  = req.headers["x-forwarded-host"] || req.headers.host;
    const greetUrl = `${proto}://${host}/api/outbound-greet`;

    let tw=null, path="";

    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      path="twilio";
      const u = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
      const enc = new URLSearchParams({ To: to, From: from, Url: greetUrl });
      const r = await fetch(u,{
        method:"POST",
        headers:{
          "Content-Type":"application/x-www-form-urlencoded",
          "Authorization":"Basic "+Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")
        },
        body: enc.toString()
      });
      const txt = await r.text();
      if(!r.ok) return reply(res,502,{ok:false,via:path,error:`twilio ${r.status}`,detail:txt.slice(0,600)});
      tw = JSON.parse(txt);
    } else if (TWILIO_MAKE_CALL && REELO_SECRET) {
      path="proxy";
      const payload = { to, from, url: greetUrl, meta:{ email, company, mode } };
      const r = await fetch(TWILIO_MAKE_CALL,{
        method:"POST",
        headers:{ "Content-Type":"application/json","x-reelo-secret":REELO_SECRET },
        body: JSON.stringify(payload)
      });
      const txt = await r.text();
      if(!r.ok) return reply(res,502,{ok:false,via:path,error:`proxy ${r.status}`,detail:txt.slice(0,600)});
      try{ tw = JSON.parse(txt) } catch { tw = { sid:null, status:"queued" }; }
    } else {
      return reply(res,500,{ok:false,error:"no dial path: set TWILIO_ACCOUNT_SID/AUTH_TOKEN or TWILIO_MAKE_CALL/REELO_SECRET"});
    }

    try{
      if(SUPABASE_URL && SUPABASE_SERVICE_ROLE){
        await fetch(`${SUPABASE_URL}/rest/v1/demo_calls`,{
          method:"POST",
          headers:{
            apikey:SUPABASE_SERVICE_ROLE, Authorization:`Bearer ${SUPABASE_SERVICE_ROLE}`,
            "Content-Type":"application/json","Accept-Profile":"public","Content-Profile":"public", Prefer:"return=minimal"
          },
          body: JSON.stringify({
            phone_e164: to, email, company,
            status: (tw && tw.status) || "queued",
            tw_sid: (tw && tw.sid) || null,
            meta: pick({mode,from,url:greetUrl,via:path},["mode","from","url","via"])
          })
        }).catch(()=>{});
      }
    }catch(_){}

    return reply(res,200,{ ok:true, via:path, sid:tw?.sid||null, status:tw?.status||"queued", to, from });
  }catch(e){
    return reply(res,500,{ ok:false, error:"unhandled", detail:String(e) });
  }
}
