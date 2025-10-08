module.exports = async (req, res) => {
  try {
    const aiUrl = process.env.AI_WEBHOOK_URL || "https://reelo-receptionist-8uql.onrender.com/voice";
    // Read From/To/CallSid (Twilio will POST them; keep query fallback just in case)
    const b = (req.body || {});
    const q = (req.query || {});
    const From = (b.From || q.From || "").toString();
    const To = (b.To || q.To || "").toString();
    const CallSid = (b.CallSid || q.CallSid || "").toString();

    // Build query then escape & for XML
    const qs = new URLSearchParams({ From, To, CallSid }).toString().replace(/&/g, "&amp;");

    const twiml =
`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Redirect method="GET">${aiUrl}?${qs}</Redirect>
</Response>`;

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/xml");
    res.end(twiml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/xml");
    res.end(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Server error.</Say></Response>`);
  }
};
