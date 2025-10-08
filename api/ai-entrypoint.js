$path = ".\api\ai-entrypoint.js"
@'
/**
 * /api/ai-entrypoint  — emits TwiML that Redirects to your AI webhook
 * Works with both ESM and CommonJS environments on Vercel.
 */
const handler = (req, res) => {
  try {
    const q = (req && req.query) || {};
    const From = q.From || "";
    const To = q.To || "";
    const CallSid = q.CallSid || "";

    // Your AI receptionist webhook (change if you move it)
    const aiUrl = process.env.AI_REDIRECT_URL
      || "https://reelo-receptionist-8uql.onrender.com/voice";

    const enc = encodeURIComponent;
    const rawUrl = `${aiUrl}?From=${enc(From)}&To=${enc(To)}&CallSid=${enc(CallSid)}`;
    const redirectUrl = rawUrl.replace(/&/g, "&amp;"); // TwiML needs &amp;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.end(
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response>` +
        `<Pause length="2"/>` +
        `<Redirect method="GET">${redirectUrl}</Redirect>` +
      `</Response>`
    );
  } catch (e) {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.statusCode = 200;
    res.end(
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response><Say>Temporary server error.</Say></Response>`
    );
  }
};

// ESM default export
export default handler;
// CommonJS fallback
module.exports = handler;
'@ | Set-Content -Path $path -Encoding UTF8
