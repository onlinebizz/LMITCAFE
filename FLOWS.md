# LMIT migration checks

## Photo-led refinement acceptance
- No italic/oblique text on any public or admin route. The homepage slogan uses
  the upright body family; verify both languages, login and detail dialogs.
- Counter product names stack above a separate price row, with both language
  lines sharing the correct alignment. Prices align across each row of cards;
  long names wrap without colliding with prices or changing photo sizes.
- Counter products open an enlarged, uncropped photo with both names, price and
  the saved description. An explicit "Click here to go back" button closes it,
  restores focus and preserves the menu's scroll position. Escape also closes.
- Check this in Arabic/English at desktop/counter/phone widths, including a
  missing photo/description and a product with a saved description.
- No Picks / المختارات section; photographs have no decorative frames or grids.
- Screen has no website link or opening status. All categories appear in a
  photo-led continuous gallery with a visible scrollbar and category navigation.
- Scrolling is manual by default. Only the admin screen settings can enable
  automatic scrolling; wheel/touch/key interaction pauses it. Automatic motion
  is controlled only in admin. The public footer has only fullscreen; reduced
  motion and live updates still work.
- Preserve the earlier counter composition: brand header, side category
  navigation and product grid. No opening status, website link or paging controls.
- Use medium, balanced product sizes: three columns on counter/desktop and two
  on phones, with bounded photo height; don't turn the menu into oversized tiles.
- Images retain their aspect ratio. Category decoration uses the existing
  forest/cream palette, not multicolored markers. Secondary text isolates bidi.
- Admin photo and names form one clickable identity; photo, editable names,
  price and availability stay together in the editor. CRUD/media still work.
- Check desktop 1280×800, counter 1024×600 and phone 390px in both languages.

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
- Check `/screen` at 1024×600, 1280×800 and 1920×1080: medium-sized photo cards,
  the existing category sidebar, readable names/prices and reachable footer.
- Scroll down through all products; open a product and use the explicit back
  button to return to the same position. Keyboard Escape also closes it.
- Category buttons select the requested category and indicate the active one.
- The menu remains stationary by default. Admin → Cafe settings → Counter screen
  can enable automatic scrolling. Manual interaction pauses it; no public
  paging, Play/Pause, status or website-link controls are rendered.
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

## Earlier production checks, before the photo-led refinement
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

## Photo-led release verification, 2026-11-06
- Local Workers suite: 18 tests passed, including detail markup, admin-only
  screen settings, CRUD/media/auth/CSRF and persistence regression checks.
- Browser: product price save/restore and description save/display/restore
  completed against local Workers. Enlarged detail, explicit back, Escape,
  missing photo/description and 390px mobile detail view passed.
- Fresh production context: restored sidebar/grid, 41 product edit/detail
  targets, one fullscreen footer button, no screen status or website link.
  Arabic product detail returned to the identical scroll offset and focus.
  Fullscreen entered/exited, with no page errors in that verification.
- Arabic/English routes, phone menu/details and 1024×600 counter layout were
  checked. The enlarged photo uses object-fit:contain, not a cropped image.
- Original product photos are still low-resolution; many drinks have no photo
  or description yet. Upload actual photos and write descriptions in admin.

## Owner password reset, 2026-11-07
- The owner forgot the dashboard password. A temporary one-time reset route,
  guarded by a random key held only in the short-lived deployment, updated the
  owner account (`lmit1100`), signed out its sessions, and was removed with a
  clean redeploy immediately after. Sign-in with the new password was verified
  against production before and after the cleanup deploy; `/healthz` is 200 and
  the route now returns 404. No password or key is stored in this repository.
- Local Workers suite: 19 tests passed on the current main after the reset.
- Deploys now work through the Cloudflare API with `npx wrangler deploy`
  (CLOUDFLARE_API_TOKEN), so GitHub-integrated Workers Builds is not required
  for manual deployments.
