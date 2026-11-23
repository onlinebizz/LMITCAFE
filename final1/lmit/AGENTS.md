# Rules for any AI agent working on this repo (also read as CLAUDE.md)

Project: Farfalli Italian restaurant and café, Abha, Saudi Arabia. Customer site, digital menu, counter display and owner dashboard. Read the root README first.

Production now targets Cloudflare Workers Free. Read the root README.md and
wrangler.toml before deployment work. Use Wrangler for local Farfalli testing.
Workers adapters live in cloudflare/; shared routes and validation
are built from server/ by scripts/build-cloudflare.js. Never edit generated
.cloudflare/ files. Wrangler is deployment tooling, not an application dependency.

## Never
- Use em or en dashes anywhere (UI, copy, code comments, metadata). Search for them before finishing.
- Write litotes, "not just X but Y", or generic AI marketing copy.
- Add stock photos, an AI generated logo, invented products, prices, phone numbers or branding.
- Replace the Farfalli design language: ivory, brick red, espresso, existing café UI and typography, and full-frame original photography.
- Add npm dependencies or external CDNs or fonts. The stack is zero dependency; fonts are local.
- Loosen the CSP (no inline script, style or style attributes), remove CSRF, rate limits, or upload checks.
- Re-enable online orders. The client does not want them.
- Store money as floats. Money is integer halalas.

## Always
- Keep Arabic RTL and English LTR both working; use logical CSS properties; every UI string goes in strings files for both languages.
- Keep touch targets at 44px minimum and focus rings visible; respect prefers-reduced-motion.
- Fix bugs you find, then say what you fixed.
- Flag missing owner assets (prices, social links, hours, photos) instead of inventing them.
- Keep the old café Durable Object and the POS untouched. See the root Farfalli deployment notes for verification and rollback.

## Verification

- Check the public site, product detail sheet, counter and admin at 390px and 1440px in both languages when changes affect layout.
- Confirm that newly supplied photographs meet the Full HD requirement and are not visibly cropped or stretched.
- Run the Worker regression suite to cover authorization, CSRF, uploads, content persistence and disabled ordering.
