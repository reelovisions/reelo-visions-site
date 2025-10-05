// /demo/js/demo-call.js
(function () {
  const $ = (sel) => document.querySelector(sel);
  const statusEl = $('#status');

  const setStatus = (msg, isError = false) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#f87171' : '#93c5fd';
  };

  const safeFetch = async (url, opts) => {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (e) {
      console.error('fetch error', e);
      setStatus('Network error while contacting server.', true);
      throw e;
    }
  };

  const start = async () => {
    console.log('[demo-call] boot');
    // 1) Load config (domain + secret) from same origin
    const cfgRes = await safeFetch('/demo/demo-config.json', { cache: 'no-store' });
    if (!cfgRes.ok) {
      console.error('[demo-call] failed to load demo-config.json', cfgRes.status);
      setStatus('Failed to load demo settings.', true);
      return;
    }
    const cfg = await cfgRes.json();
    console.log('[demo-call] config:', {
      TWILIO_DEMO_DOMAIN: cfg.TWILIO_DEMO_DOMAIN,
      REELO_SECRET_present: Boolean(cfg.REELO_SECRET),
    });

    const form = $('#demo-form');
    const phoneInput = $('#phone');

    if (!form || !phoneInput) {
      console.error('[demo-call] form or phone input not found');
      setStatus('Internal error: form not found.', true);
      return;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus(''); // clear

      let raw = (phoneInput.value || '').replace(/\D/g, '');
      console.log('[demo-call] raw digits:', raw);

      // Require exactly 10 digits (US). We will add +1 server-side.
      if (raw.length !== 10) {
        console.warn('[demo-call] need 10 digits, got:', raw.length);
        setStatus('Enter a valid 10-digit US number.', true);
        return;
      }
      const e164 = '+1' + raw;
      console.log('[demo-call] normalized:', e164);

      // 2) Call our Vercel API route (server-side) – it will talk to Twilio
      setStatus('Requesting your demo call…');
      const res = await safeFetch('/api/demo-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: e164,
          secret: cfg.REELO_SECRET, // shared secret (server will verify)
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        console.error('[demo-call] bad JSON from API', err);
        setStatus('Unexpected response from server.', true);
        return;
      }

      console.log('[demo-call] API response:', res.status, data);

      if (!res.ok || !data?.ok) {
        const msg = data?.error || `Call failed (HTTP ${res.status}).`;
        setStatus(msg, true);
        return;
      }

      setStatus('Calling now! If your iPhone shows a CallKit preview, tap to accept.');
    });
  };

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
