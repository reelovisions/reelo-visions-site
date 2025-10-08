/**
 * Minimal smoke test for /api/ai-entrypoint
 * Returns a simple TwiML document.
 */
const handler = (req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.statusCode = 200;
  res.end(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>ok</Say></Response>`
  );
};
export default handler;
module.exports = handler;
