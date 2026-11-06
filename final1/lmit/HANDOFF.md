# LMIT website: project handoff

Zero dependency Node 22 project (built-in server and SQLite). No npm install needed.

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

## Not written yet (in this order)
1. public/css/site.css (all customer styling; pages are unstyled until it exists)
2. public/js/menu.js (menu search, category rail, product sheet, cart, counter slip, order send)
3. public/admin/ (index.html, admin.css, admin.js): the owner dashboard against server/api-admin.js
4. tests/run.js, README for the owner, Dockerfile
5. Browser testing at phone and desktop sizes, Arabic and English

## Owner must confirm
Phone number, exact address, opening hours (story was 6 weeks old), V60 and Espresso items, Instagram handle, whether online ordering is wanted, original product photos (current dessert photos are small crops from the menu photo).
