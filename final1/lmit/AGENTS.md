# Rules for any AI agent working on this repo (also read as CLAUDE.md)

Project: LMIT cafe, Al Sad, Al Namas, Saudi Arabia. Customer site, digital menu, admin dashboard. Read PROMPT.md first.

## Never
- Use em or en dashes anywhere (UI, copy, code comments, metadata). Search for them before finishing.
- Write litotes, "not just X but Y", or generic AI marketing copy.
- Add stock photos, an AI generated logo, invented products, prices, phone numbers or branding.
- Copy another site's design. Keep the LMIT language: forest green, cream, brass, window-pane photo grid, dot-leader menu lines.
- Add npm dependencies or external CDNs or fonts. The stack is zero dependency; fonts are local.
- Loosen the CSP (no inline script, style or style attributes), remove CSRF, rate limits, or upload checks.
- Re-enable online orders. The client does not want them.
- Store money as floats. Money is integer halalas.

## Always
- Keep Arabic RTL and English LTR both working; use logical CSS properties; every UI string goes in strings files for both languages.
- Keep touch targets at 44px minimum and focus rings visible; respect prefers-reduced-motion.
- Fix bugs you find, then say what you fixed.
- Flag missing owner assets (V60 and Espresso items, social links, hours, photos) instead of inventing them.

## Your task list
1. Open /admin in Playwright (1440 and 390 wide, ar and en) and fix every layout or function bug. Styling is in public/admin/admin.css and was never visually checked.
2. Check the customer home and menu on phone and desktop in both languages, including the product sheet.
3. Crop and rotate in photo upload: built (public/admin/media-ui.js), verify it.
4. Scroll reveal: built (public/js/home.js), verify it.
5. Run a security pass: CSP console errors, cookie flags, CSRF, fake image upload, rate limits.
6. Grep for dashes and for missing strings (console.warn "missing string").
