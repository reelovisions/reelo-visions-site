/**
 * /api/ai-entrypoint
 * Returns TwiML that redirects the call to your AI webhook.
 * Ensures URL query ampersands are escaped as &amp; for XML validity.
 */
function xmlEscapeUrlForTwiml(u) {
  // If it already has &amp;, keep them; convert remaining raw & to &amp;
  return String(u).replace(/&(?!(?:amp;|#\d+;|[a-z]+;))/gi, "&amp;");
}

module.exports = async (req, res) => {
  try {
    const aiUrl = process.env.AI_WEBHOOK_URL || "https://reelo-receptionist-8uql.onrender.com/voice";

    // Pull params from body first (Twilio POSTs) then query as fallback
    const b = (req.body || {});
    const q = (req.query || {});
    const From = (b.From || q.From || "").toString();
    const To = (b.To || q.To || "").toString();
    const CallSid = (b.CallSid || q.CallSid || "").toString();

    const qs = new URLSearchParams({ From, To, CallSid }).toString();
    const url = `${aiUrl}?${qs}`;
    const urlEsc = xmlEscapeUrlForTwiml(url);

    const twiml =
`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Redirect method="GET">${urlEsc}</Redirect>
</Response>`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml");
    res.end(twiml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/xml");
    res.end('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Server error.</Say></Response>');
  }
};
