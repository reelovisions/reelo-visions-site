'use strict';
/** ai-entrypoint version: 20251008-103000 */
function readParam(src,k){try{return src&&src[k]?String(src[k]):''}catch{return''}}
function escAmp(s){return String(s).split('&').join('&amp;')}
module.exports = async (req,res)=>{
  try{
    const aiUrl = process.env.AI_WEBHOOK_URL || "https://reelo-receptionist-8uql.onrender.com/voice";
    const b=req.body||{}, q=req.query||{};
    const From=readParam(b,'From')||readParam(q,'From');
    const To=readParam(b,'To')||readParam(q,'To');
    const CallSid=readParam(b,'CallSid')||readParam(q,'CallSid');
    const qs = new URLSearchParams({From,To,CallSid}).toString();
    const urlEsc = escAmp(${aiUrl}?);
    const twiml = <?xml version="1.0" encoding="UTF-8"?>
<!-- ai-entrypoint version: 20251008-103000 -->
<Response>
  <Pause length="2"/>
  <Redirect method="GET"></Redirect>
</Response>;
    res.statusCode=200;
    res.setHeader("Content-Type","application/xml; charset=utf-8");
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
    res.end(twiml);
  }catch(e){
    res.statusCode=500;
    res.setHeader("Content-Type","application/xml; charset=utf-8");
    res.end('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Server error.</Say></Response>');
  }
};
