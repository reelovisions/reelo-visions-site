export default async function handler(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "POST" && method !== "GET") return res.status(405).send("Method Not Allowed");
  const targetUrl = process.env.RECEPTIONIST_TARGET_URL || "";
  const ok = !!targetUrl;
  const twiml = ok ? [
    "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>",
    "<Response>",
    "  <Pause length=\\"2\\"/>",
    `  <Redirect method="GET">${targetUrl}?From={From}&To={To}&CallSid={CallSid}</Redirect>`,
    "</Response>"
  ].join("\\n") : [
    "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>",
    "<Response>",
    "  <Hangup/>",
    "</Response>"
  ].join("\\n");
  res.setHeader("Content-Type","text/xml");
  res.status(200).send(twiml);
}
