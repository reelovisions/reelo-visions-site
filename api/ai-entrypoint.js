'use strict';
/** ai-entrypoint version: fix-escape */

function getParam(req, key) {
  try {
    if (req.body && key in req.body) return String(req.body[key]);
    if (req.query && key in req.query) return String(req.query[key]);
  } catch {}
  return '';
}

function escapeAmp(s) {
  return String(s).replace(/&/g, '&amp;');
}

module.exports = (req, res) => {
  try {
    const aiUrl =
      process.env.AI_WEBHOOK_URL ||
      'https://reelo-receptionist-8uql.onrender.com/voice';

    const From = getParam(req, 'From');
    const To = getParam(req, 'To');
    const CallSid = getParam(req, 'CallSid');

    const qs =
      `From=${encodeURIComponent(From)}&` +
      `To=${encodeURIComponent(To)}&` +
      `CallSid=${encodeURIComponent(CallSid)}`;

    const redirectUrl = escapeAmp(`${aiUrl}?${qs}`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ai-entrypoint version: fix-escape -->
<Response>
  <Pause length="2"/>
  <Redirect method="GET">${redirectUrl}</Redirect>
</Response>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.end(twiml);
  } catch (e) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Temporary server error.</Say></Response>`);
  }
};
