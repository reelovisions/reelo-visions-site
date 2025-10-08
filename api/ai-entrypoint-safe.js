// no template strings anywhere (Windows-safe, backtick-free)
export default async function handler(req, res) {
  const aiUrl = process.env.AI_WEBHOOK_URL
    || "https://reelo-receptionist-8uql.onrender.com/voice";

  const From = req.query.From || "";
  const To = req.query.To || "";
  const CallSid = req.query.CallSid || "";

  const redirectPlain =
    aiUrl +
    "?From=" + encodeURIComponent(From) +
    "&To=" + encodeURIComponent(To) +
    "&CallSid=" + encodeURIComponent(CallSid);

  function escapeAmp(s) { return String(s).replace(/&/g, "&amp;"); }
  const redirectUrl = escapeAmp(redirectPlain);

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.end(
    '<?xml version="1.0" encoding="UTF-8"?>'
    + '<Response>'
    +   '<!-- ai-entrypoint-safe v1 -->'
    +   '<Redirect method="GET">' + redirectUrl + '</Redirect>'
    + '</Response>'
  );
}
