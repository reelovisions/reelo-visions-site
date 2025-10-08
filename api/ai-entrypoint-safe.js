/**
 * /api/ai-entrypoint-safe
 * Emits TwiML that Redirects to your AI receptionist, preserving From/To/CallSid.
 * Exported as ESM default to match Vercel’s expectations.
 */
export default function handler(req, res) {
  const { From = "", To = "", CallSid = "" } = req.query ?? {};

  // Your AI receptionist webhook base URL (adjust if you ever change it)
  const aiUrl = process.env.AI_REDIRECT_URL
    || "https://reelo-receptionist-8uql.onrender.com/voice";

  // Encode the phone params for safety
  const enc = encodeURIComponent;
  const rawUrl = `${aiUrl}?From=${enc(From)}&To=${enc(To)}&CallSid=${enc(CallSid)}`;

  // TwiML needs &amp; not &
  const escapeAmp = (s) => s.replace(/&/g, "&amp;");

  const redirectUrl = escapeAmp(rawUrl);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.end(
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
      `<Pause length="2"/>` +
      `<Redirect method="GET">${redirectUrl}</Redirect>` +
    `</Response>`
  );
}
