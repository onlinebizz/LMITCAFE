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
- Overview, products, categories, photos, website and account screens load.
- Change a product price and availability, verify the public menu, then restore.
- Create, edit and delete a temporary category and product, including options.
- Upload a real photo, edit its description, attach it to a product, and verify
  the public image. Reject a fake image and protect images that are in use.
- Save business information and hours. Verify them through the public API.
- Change the password, download a content backup, log out and sign in again.
- A mutation without CSRF or from another origin is rejected.
- Content, photos and sessions survive a local Workers runtime restart.

## Deployment acceptance
- Run npx wrangler deploy --dry-run from the repository root.
- Build contains no local environment files, owner passwords or database files.
- Workers adapter does not import local SQLite, Python or child processes.
- Durable Object initialization never overwrites existing owner content.
- Inspect Arabic and English at 1440px and 390px; check console errors.
- The actual Cloudflare deployment needs the owner's connected Cloudflare
  build or account. Local checks do not establish that production is live.
