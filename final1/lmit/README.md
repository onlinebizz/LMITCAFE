# LMIT cafe website

Run: `ADMIN_EMAIL=you@x.sa ADMIN_PASSWORD='long-password' node --no-warnings server/index.js`
Site: `/` Arabic, `/en` English. Dashboard: `/admin`.

Docker: `docker build -t lmit . && docker run -p 3000:3000 -v lmit-data:/data -e SITE_URL=https://your-domain -e ADMIN_EMAIL=you@x.sa -e ADMIN_PASSWORD='long-password' lmit`

Environment: PORT, DATA_DIR, SITE_URL, COOKIE_SECURE (1 behind https).
Extra admin: `node scripts/create-admin.js`.
Backup: Dashboard, Account, Download backup. Also copy the DATA_DIR folder regularly.

## Owner guide
- Change a price: Products, tap the price, type the new number, save.
- Hide a sold out drink: Products, switch Available off.
- Add a drink: Products, Add, fill Arabic and English names, pick the category, set the price, add a photo.
- Hours, phone, map link, social links, hero text, promotions, announcement bar: Website.
- Photos: Photos, Upload. Images are resized automatically.
