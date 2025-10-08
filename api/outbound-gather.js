export default async function handler(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "POST" && method !== "GET") return res.status(405).send("Method Not Allowed");
  const digits = (req.body && (req.body.Digits || req.body.digits)) || "";
  const targetUrl = process.env.RECEPTIONIST_TARGET_URL || "";
  let body = ["<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>","<Response>"];
  if (digits === "1" && targetUrl) {
    body.push("  <Say>Connecting you now.</Say>");
    body.push(`  <Redirect method="GET">${targetUrl}</Redirect>`);
  } else {
    body.push("  <Say>Sorry, I didn’t get that. Please press 1 to connect.</Say>");
    body.push("  <Redirect method=\\"POST\\">/api/outbound-greet</Redirect>");
  }
  body.push("</Response>");
  res.setHeader("Content-Type","text/xml");
  res.status(200).send(body.join("\\n"));
}
