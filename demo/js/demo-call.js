/* /demo/js/demo-call.js
   - Normalizes to +1E.164
   - Disables button while dialing
   - Shows green/red toasts
*/
(function () {
  const form   = document.getElementById('demo-form');
  const input  = document.getElementById('phone');
  const status = document.getElementById('status');     // keeps inline text for a11y
  const btn    = document.getElementById('callBtn');

  // Prefill from ?phone= if present
  try {
    const qp = new URLSearchParams(location.search);
    const fromQuery = (qp.get('phone') || '').replace(/\D/g, '');
    if (/^\d{10}$/.test(fromQuery) && input && !input.value) {
      input.value = fromQuery.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
  } catch {}

  function setInlineMsg(t, good) {
    if (!status) return;
    status.textContent = t || '';
    status.style.color = good ? '#34d399' : '#f87171';
  }

  // Lightweight toast helper (no inline styles beyond the CSS you added)
  function toast(text, ok = true) {
    const el = document.createElement('div');
    el.className = 'toast ' + (ok ? 'toast--ok' : 'toast--err');
    el.textContent = text;
    document.body.appendChild(el);
    // auto-remove after 4s
    setTimeout(() => el.remove(), 4000);
    return el;
  }

  function normalizeUS10(value) {
    const d = (value || '').replace(/\D/g, '');
    return d.length === 10 ? '+1' + d : null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input || !btn) return;

    const e164 = normalizeUS10(input.value);
    if (!e164) {
      setInlineMsg('Enter a valid 10-digit US number.', false);
      toast('Please enter a valid 10-digit US number.', false);
      return;
    }

    // Guard against double-clicks
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    const original = btn.textContent;
    btn.textContent = 'Dialing…';
    setInlineMsg('Dialing…', true);

    try {
      const res = await fetch('/api/demo-call', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone: e164 })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data && data.ok) {
        setInlineMsg('Calling now. If iOS shows “Call Reason”, tap Accept.', true);
        toast('Calling now. If iOS shows “Call Reason”, tap Accept.', true);
      } else {
        const msg = data?.error || 'Call failed. Please try again.';
        setInlineMsg(msg, false);
        toast(msg, false);
      }
    } catch (err) {
      console.error('demo-call error:', err);
      setInlineMsg('Network error. Please try again.', false);
      toast('Network error. Please try again.', false);
    } finally {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      btn.textContent = original;
    }
  }

  if (form) form.addEventListener('submit', handleSubmit);
})();
