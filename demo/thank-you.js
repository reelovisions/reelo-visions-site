// Read query params and prefill text/phone
(() => {
  const qp = new URLSearchParams(location.search);
  const company = qp.get('company') || '';
  const email   = qp.get('email') || '';
  const phone10 = (qp.get('phone') || '').replace(/\D/g, '');

  const summaryEl = document.getElementById('summary');
  if (company || email) {
    summaryEl.textContent = `We’ll ring you with a short demo for ${company} (${email}).`;
  } else {
    summaryEl.textContent = 'Enter your number and we’ll ring you now.';
  }

  if (/^\d{10}$/.test(phone10)) {
    document.getElementById('phone').value =
      phone10.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
})();
