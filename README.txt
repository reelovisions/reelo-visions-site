# Reelo Visions – Static Site (Vercel-ready)

## How to deploy (GitHub + Vercel)
1) Create a GitHub repo named `reelo-visions-site` (empty).
2) Push this folder to GitHub.
3) In Vercel, import the repo. Settings -> Build & Development:
   - Framework Preset: Other
   - Build Command: (leave empty)
   - Output Directory: /
4) Deploy.
5) In Settings -> Domains, add `www.reelovisions.com` and `reelovisions.com`.
6) In Namecheap DNS:
   - A @ -> 76.76.21.21
   - CNAME www -> cname.vercel-dns.com
7) Back in Vercel, set www as Primary and redirect apex -> www.

## Contact form
- Edit `index.html` and replace the Formspree `action` with your endpoint.
