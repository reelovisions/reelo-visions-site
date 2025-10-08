/**
 * /api/make-call-proxy
 * Auth: header x-reelo-secret must equal process.env.REELO_SECRET
 * Body: { to, from, url }
 * Calls Twilio REST and returns { ok, sid, status }.
 */
function readRaw(req){return new Promise((res,rej)=>{let d="";try{req.setEncoding("utf8");}catch{}req.on("data",c=>d+=c);req.on("end",()=>res(d||""));req.on("error",rej);});}
function e164(s){if(!s)return"";s=String(s).trim();const plus=s.startsWith("+");s=s.replace(/[^\d]/g,"");if(plus&&s)return"+"+s;if(s.length===11&&s.startsWith("1"))return"+"+s;if(s.length===10)return"+1"+s;return s?("+")+s:"";}
function send(res,code,obj){res.statusCode=code;res.setHeader("Content-Type","application/json");res.setHeader("Access-Control-Allow-Origin","*");res.end(JSON.stringify(obj));}

module.exports = async (req,res)=>{
  try{
    if(req.method!=="POST") return send(res,405,{ok:false,error:"Method Not Allowed"});
    const { REELO_SECRET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env||{};
    if(!REELO_SECRET) return send(res,500,{ok:false,error:"missing REELO_SECRET"});
    if(req.headers["x-reelo-secret"]!==REELO_SECRET) return send(res,401,{ok:false,error:"bad secret"});
    if(!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return send(res,500,{ok:false,error:"missing Twilio creds"});

    let body={}; try{ const raw=await readRaw(req); body=raw?JSON.parse(raw):{} }catch{ body={} }
    const to=e164(body.to), from=e164(body.from); const url=String(body.url||"").trim();
    if(!to || !from || !url) return send(res,400,{ok:false,error:"need to, from, url"});

    const twUrl=`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const enc=new URLSearchParams({ To:to, From:from, Url:url }).toString();
    const r=await fetch(twUrl,{ method:"POST",
      headers:{ "Content-Type":"application/x-www-form-urlencoded",
        "Authorization":"Basic "+Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")},
      body:enc
    });
    const txt=await r.text();
    if(!r.ok) return send(res,502,{ok:false,error:`twilio ${r.status}`,detail:txt.slice(0,600)});
    let tw={}; try{ tw=JSON.parse(txt) }catch{ tw={sid:null,status:"queued"} }
    return send(res,200,{ ok:true, sid:tw.sid||null, status:tw.status||"queued" });
  }catch(e){ return send(res,500,{ok:false,error:"unhandled",detail:String(e)}); }
};
