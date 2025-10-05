(() => {
  const form   = document.getElementById('demo-form');
  const input  = document.getElementById('phone');
  const status = document.getElementById('status');

  const TWILIO_FN_DOMAIN = 'https://reelo-demo-service-2156.twil.io';
  const DEMO_SECRET      = 'RV-DEMO-2025-10-06';

  const setStatus = (msg, ok = true) => {
    status.textContent = msg;
    status.style.color = ok ? '#86efac' : '#fca5a5';
  };

  const normalizeUS = (raw) => {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length !== 10) return null;
    return '+1' + digits;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');

    const e164 = normalizeUS(input.value);
    if (!e164) {
      setStatus('Enter a valid 10-digit US number.', false);
      input.focus();
      return;
    }

    try {
      setStatus('Calling…');
      const body = new URLSearchParams({ to: e164, secret: DEMO_SECRET }).toString();

      const res = await fetch(`${TWILIO_FN_DOMAIN}/reelo-make-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setStatus('Ringing your phone now!');
      } else {
        console.error('Server error', data);
        setStatus(data.error || 'Call failed. Please try again.', false);
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error. Please try again.', false);
    }
  });
})();
