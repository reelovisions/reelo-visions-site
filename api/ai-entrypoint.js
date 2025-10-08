'use strict';
/** ai-entrypoint version: smoke-1 */
module.exports = (req, res) => {
  // Hard-coded redirect just to prove the path + escaping works.
  const urlEsc = 'https://reelo-receptionist-8uql.onrender.com/voice?From=TEST&To=TEST&CallSid=TEST'.replace(/&/g, '&amp;');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ai-entrypoint version: smoke-1 -->
<Response>
  <Pause length="2"/>
  <Redirect method="GET">${urlEsc}</Redirect>
</Response>`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.end(twiml);
};
