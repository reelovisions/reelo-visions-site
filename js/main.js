// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const siteNav = document.getElementById('siteNav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.style.display === 'flex';
    siteNav.style.display = open ? 'none' : 'flex';
    navToggle.setAttribute('aria-expanded', String(!open));
  });
}

// Footer year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Simple contact form UX (works with Formspree or any 200 response)
const form = document.getElementById('contactForm');
const formMsg = document.getElementById('formMsg');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      if (res.ok) {
        form.reset();
        formMsg.textContent = 'Thanks! We will reply shortly.';
      } else {
        formMsg.textContent = 'Failed to send. Email us at hello@reelovisions.com';
      }
    } catch (err) {
      formMsg.textContent = 'Network error. Try again or email us directly.';
    }
  });
}
