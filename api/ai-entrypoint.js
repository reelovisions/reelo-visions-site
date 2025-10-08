// No template literals in this file on purpose (to avoid Windows/PowerShell backtick issues)

export default async function handler(req, res) {
  const aiUrl =
    process.env.AI_WEBHOOK_URL ||
    "https://reelo-receptionist-8uql.onrender.com/voice";

  const From = req.query.From || "";
  const To = req.query.To || "";
  const CallSid = req.query.CallSid || "";

  // Build query without backticks
  const redirectPlain =
    aiUrl +
    "?From=" + encodeURIComponent(From) +
    "&To=" + encodeURIComponent(To) +
    "&CallSid=" + encodeURIComponent(CallSid);

  // TwiML requires &amp; in XML
  function escapeAmp(s) {
    return String(s).replace(/&/g, "&amp;");
  }
  const redirectUrl = escapeAmp(redirectPlain);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.end(
    '<?xml version="1.0" encoding="UTF-8"?>' +
      "<Response>" +
        '<Redirect method="GET">' + redirectUrl + "</Redirect>" +
      "</Response>"
  );
}
