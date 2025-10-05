(() => {
  async function getConfig(){
    const r = await fetch("/demo/demo-config.json", {cache:"no-store"});
    if(!r.ok) throw new Error("Config load failed");
    return r.json();
  }
  function normalizeUS(v){
    const d = (v||"").replace(/\\D/g,"");
    if(!/^\\d{10}$/.test(d)) return null;
    return "+1"+d;
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
        const body = new URLSearchParams({ to: e164, secret: cfg.REEL0_SECRET });
        const resp = await fetch(cfg.TWILIO_DEMO_DOMAIN + "/reelo-make-call", {
          method:"POST",
          headers:{"Content-Type":"application/x-www-form-urlencoded"},
          body
        });
        const data = await resp.json().catch(()=>({}));
        if(resp.ok && data && data.ok){
          status.textContent = "Calling… check your phone!";
          status.style.color = "#22c55e";
        }else{
          status.textContent = (data && data.error) ? data.error : "Call failed.";
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
