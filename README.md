# Farfalli Café & Restaurant

Arabic and English café site, menu, counter display and owner dashboard for Farfalli in Abha. It runs on the existing [café Worker](https://l.lmitcafe.workers.dev/) and does not deploy or manage the POS.

| Route | Purpose |
| --- | --- |
| [`/`](https://l.lmitcafe.workers.dev/) and [`/en`](https://l.lmitcafe.workers.dev/en) | Arabic and English home, menu highlights and visit information |
| [`/menu`](https://l.lmitcafe.workers.dev/menu) and [`/en/menu`](https://l.lmitcafe.workers.dev/en/menu) | Bilingual catalog, search, categories and product details |
| [`/screen`](https://l.lmitcafe.workers.dev/screen) and [`/en/screen`](https://l.lmitcafe.workers.dev/en/screen) | Interactive counter display |
| [`/admin`](https://l.lmitcafe.workers.dev/admin) | Farfalli owner workspace for dishes, prices, availability, photos, website settings and backups |

The catalog starts with ten items from [Farfalli's published menu](https://qr.finedinemenu.com/farfyly/menu/64cfe4e978ffb800146315d2) and seven approved, uncropped photos at 2048 × 1365. Smaller responsive renditions come from the same originals. Items whose photos did not meet Full HD display a branded placeholder. Opening hours and prices are unpublished until verified, and online ordering is disabled.

## Development and release

Use Node 22.13 or newer. Install with `npm ci`, run `npm test`, and start a local Worker with `npm run dev`. Root `npm run build` generates `final1/lmit/.cloudflare/`; do not edit generated files. The source directory retains its historical path, but the Cloudflare build packages Farfalli assets and data.

Farfalli runs under `farfalli-primary`, a separate Durable Object instance. The old instance and version are retained only for recovery. Never reset either instance to deploy, and do not touch the POS configuration. See [the release and rollback notes](FARFALLI-DEPLOYMENT.md) and [the user flows](FLOWS.md).

GitHub `main` is the canonical source. A Git push does not by itself prove that a Cloudflare build or live deployment succeeded. Verify the active Worker version and the site's public and admin routes after each cutover.
