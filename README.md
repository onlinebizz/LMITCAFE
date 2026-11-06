# LMIT Cafe

Arabic and English cafe website, digital menu and owner dashboard. The production
target is Cloudflare Workers Free with one SQLite-backed Durable Object.
The original Node application remains available in `final1/lmit`.

## Cloudflare deployment

Connect this repository in Workers Builds with the repository root as the root
directory. Use `npx wrangler deploy` as the deploy command. No separate build
command is necessary: `wrangler.toml` runs `npm run build` before deployment.
Use Node 22.13 or newer. The Worker name in Cloudflare must match
`name = "l"` in `wrangler.toml`. The current live address is
[l.lmitcafe.workers.dev](https://l.lmitcafe.workers.dev).

Wrangler is a development and deployment tool only. There are no third-party
application libraries, external CDNs or remotely loaded fonts in the site.

The build copies the original site assets and adapts the existing route modules.
It does not launch a Node server, start Python or open a local SQLite file.
Cloudflare serves static files and runs the database-backed pages and APIs.
See [Cloudflare's static assets documentation](https://developers.cloudflare.com/workers/static-assets/).

This project sets the Durable Object code update strategy to `immediate` so the
database-backed page renderer and static assets update together. The singleton
object name stays `lmit-primary`; never rename it to force a deployment.
See [Durable Objects code updates](https://developers.cloudflare.com/durable-objects/deployments/durable-objects-code-updates/).

## Counter screen, customer menu and owner account

- `/screen` is the Arabic counter display; `/en/screen` is its English version.
  It retains the brand header, category sidebar and medium-sized product grid.
  Customers scroll manually or choose a category. The only footer control is
  fullscreen; there is no opening status, website link or paging control.
  Tap a product to see its full, uncropped photo, both names, price and saved
  description. “Click here to go back” returns to the same scroll position;
  Escape also closes the detail view.
  Automatic scrolling is off by default. Only the owner can enable it under
  Cafe settings → Counter screen (`#/website/screen`); manual interaction pauses
  it and reduced-motion preferences are respected.
- `/menu` and `/en/menu` are scrollable phone menus with photos, names, prices,
  category shortcuts, search and product details. There is no cart, checkout,
  quantity selector or add-to-cart action.
- Prices use the official Saudi riyal outlines through a bundled local font.
  Products without an original photo use a branded placeholder, not a fabricated
  product photo. Upload actual product photos in the admin dashboard.
- `/admin` opens directly on the item list after sign-in. The three primary
  sections are Menu, Photos and Cafe settings. Category management, reordering,
  account options and optional product details are tucked away.
  Each product's thumbnail and names are one edit link. Its editor keeps the
  larger photo beside the name, price and availability fields. Add descriptions
  under “Extra details (optional)”; the counter detail view uses that saved text.

The production owner was provisioned on 2026-11-06 using the owner's secure
credential form. Sign in with the username and password selected there. No
password is committed to this repository. Account settings are under More.

### Provisioning a new, empty installation

In the Cloudflare dashboard, open this Worker, then **Settings**, **Variables and
Secrets**. Add both entries as secrets:

| Name | Value |
| --- | --- |
| `ADMIN_EMAIL` | The owner's email address |
| `ADMIN_PASSWORD` | A unique password between 10 and 200 characters |

Save the secrets and deploy the updated configuration. Open `/admin` and sign in
with those values. The first successful sign-in creates the owner account in the
Durable Object. There is no default account or unauthenticated setup page.
Do not put the password in GitHub, a `.env` file committed to Git, or a chat.

After the account exists, change its password from **Account** in the dashboard.
Changing the bootstrap secrets does not reset an existing account's password.
Sessions, hashed passwords, CSRF tokens and login rate limits persist in storage.

If sign-in reports that setup is required, the running deployment does not have
both secrets. A working public website does not mean an owner account exists.

Alternatively, `scripts/deploy-cloudflare-api.py` deploys a Wrangler dry-run
bundle through the official Cloudflare API. Run it through the secure credential
wrapper; `--setup-owner` additionally uses the site's saved Basic credential.
It creates a random one-time setup secret, provisions only an empty installation,
verifies sign-in, and deletes that setup secret. Passwords and session tokens
stay in process memory. Existing owner accounts are never reset.

### Automatic builds need a token refresh

As of 2026-11-06, the live app has been deployed through the API fallback.
The GitHub-triggered Workers Build still fails before deployment with:
“The build token selected for this build has been deleted or rolled.”
The currently valid API credential does not refresh the secret already saved
in Workers Builds. In this Worker's **Settings → Builds → API token**, replace
the saved build token and retry the build. Do not revoke the working API token
or change the Durable Object identity. Until this is repaired, a pushed commit
is saved in GitHub but is not automatically deployed.

## Storage and the free plan

One named Durable Object, `lmit-primary`, holds the menu, site settings, sessions,
audit log and uploaded image bytes. Deployments seed it only when it is empty.
Rebuilding or redeploying does not overwrite owner edits or uploaded photos.
Do not change the object's name, binding, class or migration history to fix a
deployment issue: doing so can select a different database.

SQLite-backed Durable Objects are available on Workers Free. Current included
limits are 100,000 requests per day, 13,000 GB-s of duration per day, 5 million
SQLite rows read per day, 100,000 rows written per day and 5 GB of SQLite storage.
Exceeding a free limit causes the affected operations to fail rather than billing
overages. These are platform limits, not a promise of unlimited hosting.
See [Cloudflare's Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).
Static asset requests that do not invoke the Worker are free and unlimited under
[Workers static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

R2, external servers, a paid database and Cloudflare Images are not required.
The photo uploader decodes JPG, PNG and WebP in the browser, limits dimensions to
2400 pixels on the longest side, and submits a normalized PNG. The server checks
chunks, CRCs, decompressed scanlines and size before storing it. Photos have a
10 MB limit; a large normalized photo may need to be cropped or resized further.
Public images and local fonts keep their existing URLs.

Online order submission remains disabled. The previous counter-list/cart feature
has been removed from the customer menu entirely.

## Local checks

With Node 22.13 or newer:

```sh
npm ci
npm run build
npx wrangler deploy --dry-run
npm test
```

For local browser development, create an untracked `.dev.vars` file with your
local test `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then run `npm run dev`.
Wrangler's local database lives under `.wrangler/`, which is excluded from Git.
Local state and production state are separate.

The regression suite starts its own isolated local Worker, generates temporary
test credentials, exercises edits and security checks, and restarts the runtime
to verify persistence. It does not use or modify the production website.

## Maintaining the initial seed

The build uses committed, preprocessed photos and menu metadata under
`final1/lmit/cloudflare/seed/`. They contain only the original public cafe content.
The build never exports a developer's local database.

If the original menu seed or original photos change, regenerate the initial seed
with Node 22 and Python with Pillow:

```sh
node --no-warnings final1/lmit/scripts/refresh-cloudflare-seed.js
```

Commit the resulting seed files. This changes the initial content for a new
database only; use the dashboard to edit an existing production database.

## Backups and owner details

The dashboard's content backup exports products, categories, promotions and
settings. It does not include photo bytes, users or sessions and is not a complete
database recovery backup. Original seed photos remain committed in this repo.
Keep additional copies of uploaded owner photos outside the application.

The owner still needs to confirm exact hours, phone/address details and social
links, and supply V60 and Espresso options and original product photos.
No missing products, prices or branding have been invented.
