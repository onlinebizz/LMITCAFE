# LMIT website: project handoff

Production uses Cloudflare Workers Free with a SQLite-backed Durable Object.
Read the repository root README.md for deployment, owner secrets and regression
tests. The original zero-dependency Node 22 server remains a local fallback.

## Run
    node --no-warnings server/index.js          # http://localhost:3000
    # first admin (pick your own password, 10+ characters):
    node scripts/create-admin.js owner@example.com "your long password"
First start seeds the database from seed/ (needs python3 with Pillow for image resizing).

## Done
- server/: database, auth (scrypt, hashed sessions, CSRF, rate limits), admin API, public API, image pipeline, live updates (SSE), page renderer (pages.js)
- Menu seeded from the cafe's printed menu: 5 categories, 41 products, prices as printed
- public/js/view.js: shared Arabic and English page markup, opening hours logic, icons
- public/js/shell.js, home.js: live refresh and open/closed chip
- Brand: real logo cut from the owner's screenshot (public/brand), fonts (public/fonts, SIL OFL), tokens.css
- Settings seeded: hours from the cafe's story, tagline lines from the cafe's own signage

## Current implementation
- public/css/site.css and public/js/menu.js implement the branded public site,
  search, categories and product sheets.
- public/admin/ implements the bilingual owner dashboard.
- cloudflare/ adapts persistence, authentication, media and the HTTP boundary.
- The root wrangler.toml builds and deploys both public pages and the admin API.
- tests/cloudflare.test.js checks the actual local Workers runtime, including
  authentication, edits, upload validation, rate limits and restart persistence.
- Production owner sign-in requires ADMIN_EMAIL and ADMIN_PASSWORD secrets.
- Online order submission remains disabled.

## Owner must confirm
Phone number, exact address, opening hours (story was 6 weeks old), V60 and Espresso items, Instagram handle, whether online ordering is wanted, original product photos (current dessert photos are small crops from the menu photo).
