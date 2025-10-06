// Pre-fill from localStorage or query string
(function () {
  const qs = new URLSearchParams(window.location.search);
  const fromQS = (qs.get('phone') || '').trim();
  const phoneInput = document.getElementById('phone');

  const lsPhone = (localStorage.getItem('rv_phone') || '').trim();
  const lsEmail = (localStorage.getItem('rv_email') || '').trim();
  const lsCompany = (localStorage.getItem('rv_company') || '').trim();

  phoneInput.value = fromQS || lsPhone || '';

  const btn = document.getElementById('startCall');
  const status = document.getElementById('status');

  function setStatus(msg, cls) {
    status.textContent = msg;
    status.className = 'note ' + (cls || '');
  }

  btn.addEventListener('click', async () => {
    const to = phoneInput.value.trim();
    if (!to) return setStatus('Enter your mobile number.', 'err');
    if (!/^\+?[1-9]\d{7,15}$/.test(to)) {
      return setStatus('Use E.164 format, e.g. +16125551234.', 'err');
    }

    btn.disabled = true;
    setStatus('Connecting your demo call…');

    try {
      const payload = {
        to,
        email: lsEmail,
        company: lsCompany
      };

      const r = await fetch('/api/demo-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await r.json().catch(() => ({}));
      if (!r.ok || json.ok === false) {
        setStatus(json.error || 'Could not start the call.', 'err');
      } else {
        setStatus('✅ Call started. Answer your phone!', 'ok');
      }
    } catch (e) {
      setStatus('Network error. Please try again.', 'err');
    } finally {
      btn.disabled = false;
    }
  });
})();
