// Vercel Serverless Function: TwiML Greeting + IVR
// Pause 3s, then prompt: "Press 1 to connect to the AI receptionist."
export default async function handler(req, res) {
  // Enforce POST from Twilio, but allow GET for quick sanity checks
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const promptText = 'Thanks for calling. Press 1 to connect to the AI receptionist.';

  const twiml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    // 3-second pause for “short ring” feel
    '  <Pause length="3"/>',
    // Gather 1 digit with a short timeout; non-input falls through to a re-prompt
    '  <Gather input="dtmf" numDigits="1" timeout="4" action="/api/voice-gather" method="POST">',
    `    <Say>${promptText}</Say>`,
    '  </Gather>',
    // If no input, say it once more and loop back to Gather (one extra try)
    '  <Say>No input detected.</Say>',
    '  <Redirect method="POST">/api/voice-greet</Redirect>',
    '</Response>'
  ].join('');

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml);
}
