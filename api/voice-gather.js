// Vercel Serverless Function: Handle IVR selection
// If "1": connect to AI receptionist target (env var). Else: re-prompt.
export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const digits = (req.body && (req.body.Digits || req.body.digits)) || null;
  const target = process.env.RECEPTIONIST_TARGET_E164 || '+16128406268'; // demo default

  if (digits === '1') {
    // Connect: you can swap <Dial> for a SIP/Function/Studio target later.
    const twiml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Say>Connecting you to our AI receptionist now.</Say>',
      `  <Dial callerId="${process.env.TWILIO_CALLER_ID || ''}">${target}</Dial>`,
      '</Response>'
    ].join('');
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(twiml);
    return;
  }

  // Anything else (or no digits): re-prompt once more
  const twiml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    '  <Say>Sorry, I didn’t get that.</Say>',
    '  <Redirect method="POST">/api/voice-greet</Redirect>',
    '</Response>'
  ].join('');

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml);
}
