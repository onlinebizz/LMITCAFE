# Farfalli production cutover

The `main` branch keeps the original café Worker UI and application behavior with Farfalli's theme, published menu items and a distinct café admin. The separate POS Worker is not part of this build or deployment.

## Isolation and rollback

- Worker: `l` at `https://l.lmitcafe.workers.dev/`.
- Previously active Cloudflare version: `3119158a-a0a7-42a7-9df9-a281bf2c1548`.
- Original LMIT café object: `lmit-primary`. Do not copy, clear, migrate or modify its data.
- Farfalli café object: `farfalli-primary` within the same class and namespace. It seeds once, with nothing from LMIT's data or user accounts. Its cookie name is distinct.
- Keep the Durable Object binding, class, migration tag, and table schema intact. Restoring the previous Worker version restores the original asset bundle and switches back to LMIT's original object.
- Provision a new Farfalli owner with the secure credential form and one-time setup mechanism. Do not use LMIT or POS credentials. `scripts/deploy-cloudflare-api.py` checks the inactive version's binding and migration, then smoke-tests the corresponding Wrangler build if Cloudflare does not generate a version URL for the Durable Object Worker. It provisions through a temporary version and deploys the verified release without the setup binding. The active-version guard stops it if production diverges, and it rolls back a failed live verification.

## Verification

Check Arabic and English home and menu, location/call links, menu search, keyboard and sheet dismiss behavior, photo decoding, counter display, and desktop/mobile fit. On a local seed, check admin sign-in, wrong password, photo access, item edits, settings and persistence. After deploy, verify the current deployment and unchanged binding, public routes, owner sign-in and the unchanged POS deployment. Do not submit an order or modify another café's records.

## Farfalli data

- [Farfalli's published FineDine menu](https://qr.finedinemenu.com/farfyly/menu/64cfe4e978ffb800146315d2) is the source of the selected dish names and photos. Follow the outbound link for the full menu, prices and availability. A zero base price in this Worker means unpublished; the seed does not claim prices.
- [Tripadvisor listing](https://ar.tripadvisor.com/Restaurant_Review-g298542-d23100184-Reviews-Abha_Asir_Province.html) and [Google Maps listing](https://g.page/Farfalli?share) support the location and telephone. Opening hours were not consistent across listings and are left unset until the owner verifies them.
- The user confirmed permission to publish the reviewed photo set. Only seven originals at 2048 × 1365 are published, with no crop or upscale. Smaller files for responsive screens are derived from those originals without a crop. The lower-resolution café drink and interior photos remain off the public site. [Photo credits](FLOWS.md#initial-data-and-photo-credits) are documented alongside the customer flows. The site remains clearly labeled independent.
