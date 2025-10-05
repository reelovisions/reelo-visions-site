// /demo/js/demo-call.js
(function () {
  const form   = document.getElementById('demo-form');
  const input  = document.getElementById('phone');
  const status = document.getElementById('status');

  // prefill from ?phone= if present (10 digits only)
  try {
    const qp = new URLSearchParams(location.search);
    const fromQuery = (qp.get('phone') || '').replace(/\D/g, '');
    if (/^\d{10}$/.test(fromQuery) && input && !input.value) {
      input.value = fromQuery.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
  } catch {}

  function msg(t, good) {
    if (!status) return;
    status.textContent = t;
    status.style.color = good ? '#34d399' : '#f87171';
  }

  async function callNow(e) {
    e.preventDefault();
    if (!input) return;

    // Normalize to 10 digits → +1E.164
    const raw    = (input.value || '').toString();
    const digits = raw.replace(/\D/g, '');

    if (digits.length !== 10) {
      msg('Enter a valid 10-digit US number.', false);
      return;
    }

    const e164 = '+1' + digits;
    msg('Dialing…', true);

    try {
      const res = await fetch('/api/demo-call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: e164 })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data && data.ok) {
        msg('Calling now. If your phone shows “Call Reason”, tap Accept.', true);
      } else {
        msg(data?.error || 'Call failed. Please try again.', false);
      }
    } catch (err) {
      msg('Network error. Please try again.', false);
      console.error('demo-call error:', err);
    }
  }

  if (form) form.addEventListener('submit', callNow);
})();
