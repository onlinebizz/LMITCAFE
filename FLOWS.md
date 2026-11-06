# LMIT migration checks

Baseline inspected on 2026-11-06: the Arabic homepage and admin login render
from the original Node server. The existing application is the design baseline.

## Customer site
- Open / and /en at desktop and phone widths. Check the hero, photos, navigation,
  language switch, footer and opening status.
- Open /menu and /en/menu. Search for a known product, clear the search, choose
  a category, open a product sheet and close it.
- Online orders stay disabled, including a direct POST to /api/orders.
- Existing images, local fonts, stylesheet and JavaScript URLs resolve.
- Unknown pages return a localized 404 page.

## Owner dashboard
- Open /admin, change language, submit an incorrect password, then sign in.
- Menu is the default screen. Menu, Photos and Cafe settings are primary.
  Categories and account remain accessible under More settings.
- Change a product price and availability, verify the public menu, then restore.
- Create, edit and delete a temporary category and product, including options.
- Upload a real photo, edit its description, attach it to a product, and verify
  the public image. Reject a fake image and protect images that are in use.
- Save business information and hours. Verify them through the public API.
- Change the password, download a content backup, log out and sign in again.
- A mutation without CSRF or from another origin is rejected.
- Content, photos and sessions survive a local Workers runtime restart.

## Counter screen and browse-only menu acceptance
- Check `/screen` at 1024×600, 1280×800 and 1920×1080: four/six product cards,
  full-width stage, readable names/prices and no card/footer clipping.
- Previous and next change the displayed page; previous restores the page.
- Category buttons select the requested category and indicate the active one.
- Auto advance changes the page after 15 seconds (or `?seconds=8` for testing).
  Pause freezes the page; Play resumes. Resizing updates the page capacity.
- Fullscreen enters and exits; English/Arabic switch retains the screen route.
- Phone `/menu` and `/en/menu` at 390px: no horizontal document overflow,
  horizontal category rail, scrollable photo/name/price cards and correct symbol.
- Search a known Arabic name, open/close its details, then clear the search.
  Search gibberish and clear the empty state. No cart or add-to-cart controls.
- Admin: opening an existing product must not throw a null-focus exception.
  Required fields and Save are visible; advanced details start collapsed.
- Optional-field validation expands its enclosing details before focusing it.
- Photo field with no image must not render the literal word `null`.
- Reordering controls start hidden and become available through More settings.
- On phone admin, four bottom tabs fit: Menu, Photos, Cafe settings and More.

## Verified production checks, 2026-11-06
- Owner provisioned from secure credential form. Basic login and authenticated
  `/api/admin/me` passed; one-time setup secret was deleted.
- Screen fit, paging/category controls and fullscreen passed at the sizes above.
- Arabic and English phone menu rendered, known-name search and details passed;
  no cart controls or JavaScript page errors were found in those checks.
- Local Workers regression suite: 16 passing tests, including persistence,
  username login, CRUD, media, CSRF, password change and rate limits.

## Deployment acceptance
- Run npx wrangler deploy --dry-run from the repository root.
- Build contains no local environment files, owner passwords or database files.
- Workers adapter does not import local SQLite, Python or child processes.
- Durable Object initialization never overwrites existing owner content.
- Inspect Arabic and English at 1440px and 390px; check console errors.
- Production was deployed through the Cloudflare API using secure credentials.
  Verify the saved Workers Builds token separately; a successful API deployment
  does not establish that automatic deployments from GitHub are healthy.
