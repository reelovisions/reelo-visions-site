// Minimal, backtick-free, bulletproof redirect to your Render voice webhook
export default function handler(req, res) {
  try {
    // Your Render voice endpoint (change if needed)
    var aiUrl = process.env.AI_REDIRECT_URL || 'https://reelo-receptionist-8uql.onrender.com/voice';

    // Pull Twilio’s query params and URL-encode them
    var from   = encodeURIComponent(req.query.From   || '');
    var to     = encodeURIComponent(req.query.To     || '');
    var callId = encodeURIComponent(req.query.CallSid || '');

    // Build the querystring without template literals
    var q = '?From=' + from + '&To=' + to + '&CallSid=' + callId;

    // Final target
    var redirectUrl = aiUrl + q;

    // Return TwiML
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).end(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
        '<Redirect method="GET">' + redirectUrl + '</Redirect>' +
      '</Response>'
    );
  } catch (e) {
    // Safe fallback TwiML
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).end(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response><Say>Temporary server error.</Say></Response>'
    );
  }
}
