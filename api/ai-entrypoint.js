export default function handler(req, res) {
  // Pull params from query (twilio will pass these)
  const { From = "", To = "", CallSid = "" } = req.query || {};

  // Build the query string safely
  const qs =
    "From=" + encodeURIComponent(From) +
    "&To=" + encodeURIComponent(To) +
    "&CallSid=" + encodeURIComponent(CallSid);

  // Your Render voice webhook
  const aiUrl = "https://reelo-receptionist-8uql.onrender.com/voice";

  // Full redirect URL
  const redirectUrl = `${aiUrl}?${qs}`;

  // Escape only the ampersands for XML
  const xmlSafe = (s) => s.replace(/&/g, "&amp;");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
      `<Pause length="1"/>` +
      `<Redirect method="GET">` + xmlSafe(redirectUrl) + `</Redirect>` +
    `</Response>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(xml);
}
