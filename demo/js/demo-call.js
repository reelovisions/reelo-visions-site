(() => {
  const form   = document.getElementById("demo-form");
  const phoneI = document.getElementById("phone");
  const status = document.getElementById("status");

  const fmt = (raw) => {
    const d = (raw || "").replace(/\D/g, "");
    if (d.length < 10) return null;
    return "+1" + d.slice(-10);
  };

  const setMsg = (m, ok=false) => {
    status.textContent = m || "";
    status.style.color = ok ? "#22c55e" : "#f87171";
  };

  form?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    setMsg("");

    const normalized = fmt(phoneI?.value);
    if (!normalized) {
      setMsg("Enter a valid 10-digit US number (e.g., 612-555-0123)");
      return;
    }

    try {
      setMsg("Calling…");
      const resp = await fetch("/api/demo-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: normalized,
          secret: "RV-DEMO-2025-10-06"   // must match REELO_SECRET env var
        })
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.ok !== false) {
        setMsg("We’re ringing you now. If you have iOS Silence Unknown Callers or Live Voicemail, check the banner.", true);
      } else {
        setMsg(`Call failed: ${data?.error || resp.statusText}`);
      }
    } catch (e) {
      setMsg(`Network error: ${String(e)}`);
    }
  });
})();
