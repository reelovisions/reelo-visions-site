'use strict';
/**
 * /api/ai-entrypoint  (version: 20251008-094757)
 * TwiML redirect to your AI webhook.
 * - Reads From/To/CallSid from body or query
 * - Escapes '&' as '&amp;' for valid XML
 * - Adds version comment so we can confirm the new deploy
 */
function readParam(src, key) {
  try { const v = (src && src[key]) ? String(src[key]) : ""; return v; } catch { return ""; }
}
function escapeAmp(s) {
  // convert every raw & to &amp;  (don't try to be clever)
  return String(s).split('&').join('&amp;');
}

module.exports = async (req, res) => {
  try {
    const aiUrl = process.env.AI_WEBHOOK_URL || "https://reelo-receptionist-8uql.onrender.com/voice";

    // Twilio normally POSTs these; query is fallback
    const b = req.body || {};
    const q = req.query || {};
    const From    = readParam(b,'From')    || readParam(q,'From');
    const To      = readParam(b,'To')      || readParam(q,'To');
    const CallSid = readParam(b,'CallSid') || readParam(q,'CallSid');

    const qs = new URLSearchParams({ From, To, CallSid }).toString();  // From=&To=&CallSid=... is fine
    const redirectUrl = escapeAmp(${aiUrl}?);

    const twiml = <?xml version="1.0" encoding="UTF-8"?>
<!-- ai-entrypoint version: 20251008-094757 -->
<Response>
  <Pause length="2"/>
  <Redirect method="GET"></Redirect>
</Response>;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.end(twiml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.end('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Server error.</Say></Response>');
  }
};
