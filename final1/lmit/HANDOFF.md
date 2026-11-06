# LMIT website: project handoff

Production uses Cloudflare Workers Free with a SQLite-backed Durable Object.
Read the repository root README.md for deployment, secure owner setup and regression
tests. The original zero-dependency Node 22 server remains a local fallback.

## Run
    node --no-warnings server/index.js          # http://localhost:3000
First start seeds the database from seed/ (needs python3 with Pillow for image resizing).
Production owner provisioning uses the secure workflow in the root README, not
command-line passwords. Production and this local Node fallback are separate databases.

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
- `/screen` and `/en/screen` provide the auto-paging customer-facing counter
  display; `/menu` and `/en/menu` provide photo-first scrolling phone menus.
- The counter display shows four or six products depending on screen dimensions,
  with pause, paging, category selection and fullscreen. Default interval: 15s.
- Prices use a bundled font generated from the official Saudi riyal symbol.
- The customer menu has no cart, checkout, quantities or add-to-cart buttons.
- Admin starts on Menu, with Photos and Cafe settings as its only other primary
  sections. Categories/account are in More; descriptions/options and reordering
  stay available behind optional controls.
- cloudflare/ adapts persistence, authentication, media and the HTTP boundary.
- The root wrangler.toml builds and deploys both public pages and the admin API.
- tests/cloudflare.test.js checks the actual local Workers runtime, including
  authentication, edits, upload validation, rate limits and restart persistence.
- The production owner account was securely provisioned and sign-in/session
  verification passed on 2026-11-06. The password is not stored in Git.
- One-time setup uses a random setup secret, never works after an owner exists,
  and removes the temporary secret after provisioning.
- Durable Object code updates are immediate; do not rename `lmit-primary`.
- Online order submission remains disabled.
- Deployment warning: automatic GitHub builds still reject the saved build token
  as deleted/rolled. The live app was deployed through the secure API fallback.
  Replace the token in Worker Settings → Builds → API token before relying on
  automatic deployment. See the root README.

## Owner must confirm
Phone number, exact address, opening hours (story was 6 weeks old), V60 and Espresso items,
Instagram handle and original product photos. Missing photos have branded placeholders;
current dessert photos are small crops from the menu photo. Do not invent product
photography or enable online ordering: the requested site is browse-only.
