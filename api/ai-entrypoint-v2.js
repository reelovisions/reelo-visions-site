// Minimal, backtick-free redirect to your Render voice webhook
export default function handler(req, res) {
  try {
    var aiUrl = process.env.AI_REDIRECT_URL || 'https://reelo-receptionist-8uql.onrender.com/voice';

    var from   = encodeURIComponent(req.query.From   || '');
    var to     = encodeURIComponent(req.query.To     || '');
    var callId = encodeURIComponent(req.query.CallSid || '');

    var q = '?From=' + from + '&To=' + to + '&CallSid=' + callId;
    var redirectUrl = aiUrl + q;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).end(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
        '<Redirect method="GET">' + redirectUrl + '</Redirect>' +
      '</Response>'
    );
  } catch (e) {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).end(
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response><Say>Temporary server error.</Say></Response>'
    );
  }
}
