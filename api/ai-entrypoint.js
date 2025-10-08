// Minimal TwiML entrypoint that *only* redirects to your AI receptionist.
// CommonJS export so Vercel’s Node runtime picks it up.

const escapeAmp = (s) => s.replace(/&/g, '&amp;');

module.exports = async function aiEntrypoint(req, res) {
  try {
    // If you later set AI_VOICE_URL in Vercel, we’ll use it.
    const aiUrl =
      process.env.AI_VOICE_URL ||
      'https://reelo-receptionist-8uql.onrender.com/voice';

    // Twilio will substitute these placeholders when it calls your webhook.
    const url = `${aiUrl}?From={From}&To={To}&CallSid={CallSid}`;

    // Build TwiML — no <Say/>, just a GET Redirect.
    const twiml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Response>` +
      `<Redirect method="GET">${escapeAmp(url)}</Redirect>` +
      `</Response>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end(twiml);
  } catch (err) {
    // Worst case: return a tiny valid TwiML so Twilio doesn't retry-loop.
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Temporary server error.</Say></Response>`
    );
  }
};
