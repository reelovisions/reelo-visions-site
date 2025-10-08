export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const target = process.env.RECEPTIONIST_TARGET_E164 || '+16128406268';
  const callerId = process.env.TWILIO_CALLER_ID || '';

  const twiml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    '  <Pause length="3"/>',
    '  <Say>Connecting you to our AI receptionist now.</Say>',
    callerId
      ? `  <Dial callerId="${callerId}">${target}</Dial>`
      : `  <Dial>${target}</Dial>`,
    '</Response>'
  ].join('');

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml);
}
