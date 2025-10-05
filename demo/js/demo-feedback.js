(function () {
  const form = document.getElementById("feedback-form");
  if (!form) return;

  const phoneInput = document.getElementById("phone"); // reuse thank-you field
  const ratingSel  = document.getElementById("fb-rating");
  const reasonSel  = document.getElementById("fb-reason");
  const notesArea  = document.getElementById("fb-notes");
  const btn        = document.getElementById("fb-submit");
  const line       = document.getElementById("fb-status");

  function toast(msg, ok=true){
    const el = document.createElement('div');
    el.className = 'toast ' + (ok ? 'toast--ok' : 'toast--err');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(), 4000);
  }

  function normUS10(v){
    const d = (v||'').replace(/\D/g,'');
    return d.length===10 ? '+1'+d : null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const e164 = normUS10(phoneInput?.value);
    if (!e164){ line.textContent = 'Enter a valid US number above first.'; line.style.color='#f87171'; return; }

    const rating = parseInt(ratingSel.value,10);
    const reason = reasonSel.value;
    const notes  = notesArea.value || '';

    btn.disabled = true;
    line.textContent = 'Saving…'; line.style.color = '#93c5fd';
    try{
      const r = await fetch('/api/demo-feedback', {
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body: JSON.stringify({ phone: e164, rating, reason, notes })
      });
      const data = await r.json().catch(()=>({}));
      if (r.ok && data.ok){
        line.textContent = 'Thanks for the feedback!';
        line.style.color = '#22c55e';
        toast('Thanks for the feedback!', true);
        form.reset();
      } else {
        const msg = data?.error || 'Failed to save feedback.';
        line.textContent = msg; line.style.color='#f87171';
        toast(msg,false);
      }
    }catch(err){
      line.textContent = 'Network error.'; line.style.color='#f87171';
      console.error(err);
    }finally{
      btn.disabled = false;
    }
  });
})();
