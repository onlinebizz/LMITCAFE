# LMIT: what is built and what to do next (paste this into any new Claude session)

You are continuing a paid project: the first official website for LMIT cafe (Al Sad, Al Namas, Saudi Arabia). Work in this folder. Do not run npm: the app has zero dependencies (Node 22+, node:sqlite, Python3 + Pillow for image resizing).

## Run it
    ADMIN_EMAIL=owner@lmit.sa ADMIN_PASSWORD='choose-a-long-password' node --no-warnings server/index.js
    # open http://localhost:3000  (site)  and  /admin  (dashboard)
Env: PORT, DATA_DIR (database and uploads), SITE_URL, COOKIE_SECURE=1 behind https. Create more admins: `node scripts/create-admin.js`.

## What exists
- Customer site (Arabic RTL default, English LTR at /en): home, interactive menu (search, category rail, product sheet with variants and extras, cart, counter slip, order form), open/closed chip in Asia/Riyadh time, live updates over SSE.
- Admin (/admin, Arabic and English): overview, products (inline price, availability, featured, reorder, variants, extras, photos), categories, photos library with WebP optimization, orders, website content (hero, values, gallery, promotions, business info, hours, announcement, order switch), account (password, backup download).
- Backend: SQLite WAL, scrypt passwords, hashed session tokens, HttpOnly SameSite=Strict cookie, CSRF header, Origin check, rate limits, magic byte upload checks, strict CSP with no inline script or style, ETag caching, audit log.
- Menu seeded from the printed menu photo. V60 and Espresso categories are seeded empty on purpose.

## Hard rules (never break)
No em or en dashes anywhere. No litotes. No "not just X but Y". No generic AI copy. No stock photos, no AI logo, no invented products, prices or branding. Do not copy other people's styles. Flag missing assets to the owner instead of inventing them. Fix bugs, do not only report them. Money is stored in halalas.

## Remaining work, in order
1. Browser test the admin (Playwright, desktop 1440 and phone 390, ar and en): login, wrong password, inline price change then check /api/menu, add/edit/delete product, availability, reorder, category create/edit/delete with force, photo upload and attach, hours and business save, enable orders then POST /api/orders and change status, password change, logout. Watch the console for "missing string" and fix layout bugs in public/admin/admin.css.
2. Browser test the customer cart and order flow, the English menu, and the phone home page. Add `.item { scroll-margin-top: calc(var(--hdr) + 80px); }` to public/css/site.css.
3. Security pass: CSP violations in console, cookie flags on https, rate limit responses, upload of a fake image, CSRF without header.
4. Add a Dockerfile (node:22-slim plus python3-pil), a short owner guide in Arabic and English, and tests/run.js.
5. Deploy behind https, set COOKIE_SECURE=1 and SITE_URL, schedule backups of DATA_DIR.

## Owner must supply (flag, do not invent)
V60 and Espresso items and prices, real phone and WhatsApp numbers, Google Maps link, Instagram and other social links, confirmed opening hours, business registration and VAT details if shown, final logo files (a transparent PNG was cut from the supplied image), more food and interior photos.
Orders are disabled by design (client request). Re-enable: settings.js orders normalizer, admin nav and website SUBS.
