export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'method not allowed' });
    }

    let body = {};
    try { body = req.body ?? {}; } catch {}
    if (!body || typeof body !== 'object') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString('utf8') || '{}';
      body = JSON.parse(raw);
    }

    const phoneRaw = String(body.phone || '').replace(/\D/g, '');
    if (phoneRaw.length !== 10) {
      return res.status(400).json({ ok: false, error: 'invalid phone' });
    }
    const phone = `+1${phoneRaw}`;

    const incomingSecret =
      req.headers['x-reelo-secret'] ||
      req.headers['x-reel0-secret'] ||
      process.env.REELO_SECRET;

    if (!incomingSecret || incomingSecret !== process.env.REELO_SECRET) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const domain = process.env.TWILIO_DEMO_DOMAIN;
    if (!domain) {
      return res.status(500).json({ ok: false, error: 'server env missing: TWILIO_DEMO_DOMAIN' });
    }

    const url = `${domain.replace(/\/+$/, '')}/reelo-make-call`;
    const forward = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ to: phone, secret: incomingSecret })
    });

    const data = await forward.json().catch(() => ({}));
    return res.status(forward.ok ? 200 : 500).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'server error' });
  }
}
