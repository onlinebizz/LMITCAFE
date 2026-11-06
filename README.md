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

## Set up the owner account

In the Cloudflare dashboard, open this Worker, then **Settings**, **Variables and
Secrets**. Add both entries as secrets:

| Name | Value |
| --- | --- |
| `ADMIN_EMAIL` | The owner's email address |
| `ADMIN_PASSWORD` | A unique password between 10 and 200 characters |

Save the secrets and deploy the updated configuration. Open `/admin` and sign in
with those values. The first successful sign-in creates the owner account in the
Durable Object. There is no default account or public setup endpoint.
Do not put the password in GitHub, a `.env` file committed to Git, or a chat.

After the account exists, change its password from **Account** in the dashboard.
Changing the bootstrap secrets does not reset an existing account's password.
Sessions, hashed passwords, CSRF tokens and login rate limits persist in storage.

If sign-in reports that setup is required, the running deployment does not have
both secrets. A working public website does not mean an owner account exists.

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

Online order submission remains disabled. The menu's existing counter-list
feature is not an online checkout.

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
