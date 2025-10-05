// /demo/js/demo-call.js
(function () {
  const qs = new URLSearchParams(location.search);
  const byId = (id) => document.getElementById(id);
  const statusEl = byId('status') || (() => {
    const span = document.createElement('span');
    span.id = 'status';
    span.style.marginLeft = '12px';
    (document.querySelector('#demo-form') || document.body).appendChild(span);
    return span;
  })();

  const btn = byId('callBtn') || document.querySelector('button[type=submit]');
  const phoneInput = byId('phone') || document.querySelector('input[name=phone]');
  const form = document.getElementById('demo-form') || document.querySelector('form');

  const qpPhone = (qs.get('phone') || '').replace(/\D/g, '');
  if (qpPhone.length === 10 && phoneInput) {
    phoneInput.value = qpPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }

  let cfg = null;
  async function ensureConfig() {
    if (cfg) return cfg;
    const res = await fetch(`/demo/demo-config.json?ts=${Date.now()}`, { credentials: 'same-origin' });
    if (!res.ok) throw new Error('config load failed');
    cfg = await res.json();
    if (!cfg || !cfg.secret) throw new Error('secret missing in config');
    return cfg;
  }

  function normalizeUS(raw) { return String(raw || '').replace(/\D/g, '').slice(-10); }

  function setBusy(on, msg) {
    if (btn) { btn.disabled = !!on; btn.style.opacity = on ? '0.7' : '1'; }
    if (statusEl) { statusEl.textContent = msg || ''; statusEl.style.color = on ? '#93c5fd' : '#e5e7eb'; }
  }
  function setOK(msg)  { if (statusEl) { statusEl.textContent = msg; statusEl.style.color = '#34d399'; } }
  function setErr(msg) { if (statusEl) { statusEl.textContent = msg; statusEl.style.color = '#f87171'; } }

  async function startCall(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const config = await ensureConfig();
      const phone10 = normalizeUS(phoneInput && phoneInput.value);
      if (phone10.length !== 10) { setErr('Enter a valid 10-digit US number'); phoneInput && phoneInput.focus(); return; }

      setBusy(true, 'Calling… (watch your phone)');

      const res = await fetch('/api/demo-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-reelo-secret': config.secret },
        body: JSON.stringify({ phone: phone10 })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.ok) setOK('Call placed ✔ (answer to hear the demo)');
      else setErr(data?.error || 'Call failed');
    } catch (err) {
      setErr(err?.message || 'Network error');
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  if (form) form.addEventListener('submit', startCall);
})();
