export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'GET') return res.status(405).send('Method Not Allowed');
  const twiml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    '  <Pause length="2"/>',
    '  <Say>Thanks for requesting a demo. Press 1 to connect to our AI receptionist.</Say>',
    '  <Gather input="dtmf" numDigits="1" timeout="6" action="/api/outbound-gather" method="POST"/>',
    '  <Say>No input detected. Press 1 to connect.</Say>',
    '  <Redirect method="POST">/api/outbound-greet</Redirect>',
    '</Response>'
  ].join('\n');
  res.setHeader('Content-Type','text/xml'); res.status(200).send(twiml);
}
