export default async function handler(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "POST" && method !== "GET") return res.status(405).send("Method Not Allowed");
  const targetUrl = process.env.RECEPTIONIST_TARGET_URL || "";
  const twiml = targetUrl ? [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    "  <Pause length=\"2\"/>",
    "  <Say>Connecting you to our AI receptionist now.</Say>",
    `  <Redirect method="GET">${targetUrl}</Redirect>`,
    "</Response>"
  ].join("\n") : [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    "  <Say>Configuration missing. Please try again later.</Say>",
    "  <Hangup/>",
    "</Response>"
  ].join("\n");
  res.setHeader("Content-Type","text/xml");
  res.status(200).send(twiml);
}
