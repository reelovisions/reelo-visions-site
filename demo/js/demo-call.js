(() => {
  const $ = s => document.querySelector(s);
  const fmt = s => (s||"").replace(/\D/g,"").slice(-10);

  const qp = new URLSearchParams(location.search);
  const company = qp.get("company") || "";
  const email   = qp.get("email")   || "";
  const phone10 = fmt(qp.get("phone"));

  const summary = $("#summary");
  const phoneEl = $("#phone");
  const btn     = $("#callBtn");
  const status  = $("#status");

  if (summary) {
    summary.textContent = (company || email)
      ? `We’ll ring you with a short demo for ${company} (${email}).`
      : "Enter your number and we’ll ring you now.";
  }
  if (phone10 && phone10.length === 10) {
    phoneEl.value = phone10.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
  }

  const setStatus = (msg, cls="") => {
    status.className = `rv-status ${cls}`;
    status.textContent = msg;
  };

  $("#demo-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = fmt(phoneEl.value);
    if (raw.length < 10) { setStatus("Enter a valid 10-digit US number", "err"); return; }

    btn.classList.add("loading");
    btn.setAttribute("disabled", "true");
    setStatus("Placing your demo call…");

    try {
      const res = await fetch("/api/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+1${raw}` })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setStatus(data?.error || `Call failed (HTTP ${res.status}). Check number & try again.`, "err");
      } else {
        setStatus("Calling now! If iOS shows “Call Reason” Preview, tap Accept.", "ok");
      }
    } catch {
      setStatus("Network error – please try again.", "err");
    } finally {
      btn.classList.remove("loading");
      btn.removeAttribute("disabled");
    }
  });
})();
