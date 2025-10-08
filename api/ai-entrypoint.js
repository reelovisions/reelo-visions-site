// api/ai-entrypoint.js
export default async function handler(req, res) {
  // Accept both GET (Twilio webhook) and POST (your page calling it)
  const q = req.method === "GET" ? (req.query || {}) : (req.body || {});
  const From = q.From || "";
  const To = q.To || "";
  const CallSid = q.CallSid || "";

  // Your AI receptionist webhook (Render)
  const base = "https://reelo-receptionist-8uql.onrender.com/voice";

  // Build the target URL and carry through the common params
  const u = new URL(base);
  if (From) u.searchParams.set("From", From);
  if (To) u.searchParams.set("To", To);
  if (CallSid) u.searchParams.set("CallSid", CallSid);

  // Escape & for XML
  const target = u.toString().replace(/&/g, "&amp;");

  // Emit TwiML that redirects with GET (required)
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect method="GET">${target}</Redirect>
</Response>`
  );
}
