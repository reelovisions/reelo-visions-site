(() => {
  async function getConfig(){
    const r = await fetch("/demo/demo-config.json", {cache:"no-store"});
    if(!r.ok) throw new Error("Config load failed");
    return r.json();
  }
  function normalizeUS(v){
    const d = (v||"").replace(/\D/g,"");
    if (d.length === 10) return "+1"+d;
    if (d.length === 11 && d.startsWith("1")) return "+1"+d.slice(1);
    return null;
  }
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("demo-form");
    const phone = document.getElementById("phone");
    const btn = document.getElementById("callBtn");
    const status = document.getElementById("status");
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      status.textContent = "";
      const e164 = normalizeUS(phone.value);
      if(!e164){ status.textContent="Enter a valid 10-digit US number."; status.style.color="#f87171"; return; }
      btn.disabled = true;
      try{
        const cfg = await getConfig();
        const body = new URLSearchParams({ to: e164, secret: cfg.REEL0_SECRET || cfg.REELO_SECRET || cfg.REEL_O_SECRET });
        const resp = await fetch(cfg.TWILIO_DEMO_DOMAIN + "/reelo-make-call", {
          method:"POST",
          headers:{"Content-Type":"application/x-www-form-urlencoded"},
          body
        });
        const text = await resp.text();
        let data = {};
        try{ data = JSON.parse(text); }catch(_){ data = { raw:text }; }
        if(resp.ok && data && (data.ok === true || data.sid)){
          status.textContent = "Calling… check your phone!";
          status.style.color = "#22c55e";
        }else{
          status.textContent = (data && (data.error || data.message)) ? (data.error || data.message) : "Call failed.";
          status.style.color = "#f87171";
        }
      }catch(err){
        status.textContent = err.message || "Call failed.";
        status.style.color = "#f87171";
      }finally{
        btn.disabled = false;
      }
    });
  });
})();
