import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { t as text, renderHours } from '../public/js/view.js';
import { displayGallery, renderScreen } from '../public/js/display-view.js';

function png(width = 1, height = 1, random = false) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
    const tail = Buffer.alloc(4); tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([head, body, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const pixels = random ? crypto.randomBytes((width * 4 + 1) * height) : Buffer.from([0, 8, 37, 25, 255]);
  if (random) for (let row = 0; row < height; row++) pixels[row * (width * 4 + 1)] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('Weekday translations stay arrays and render complete day names', () => {
  assert.equal(text('en', 'days')[0], 'Sunday');
  assert.equal(text('ar', 'days')[5], 'الجمعة');
  const hours = { hours: Array.from({ length: 7 }, (_, day) => ({ day, closed: false, ranges: [{ open: '06:00', close: '23:00' }] })) };
  assert.match(renderHours(hours, 'en'), /Saturday to Friday/);
  assert.match(renderHours(hours, 'ar'), /السبت إلى الجمعة/);
});
test('Counter display renders all products, without links/status or default automatic motion', () => {
  const products = Array.from({ length: 11 }, (_, index) => ({ id: index + 1, name_ar: `صنف ${index + 1}`, name_en: `Item ${index + 1}`, price: 10, available: true }));
  const categories = [{ id: 1, name_ar: 'ساخن', name_en: 'Hot', products }, { id: 2, name_ar: 'فارغ', products: [] }];
  const markup = displayGallery(categories, 'ar');
  assert.equal((markup.match(/class="screen-card"/g) || []).length, 11);
  assert.match(markup, /ريال سعودي/);
  assert.doesNotMatch(markup, /data-add|cart-bar/);
  assert.match(displayGallery([], 'ar'), /القائمة تحت التحديث/);
  const screen = renderScreen({}, categories, 'ar');
  assert.doesNotMatch(screen, /screen-status|screen-phone-link|screen-page-count|screen-prev/);
  assert.match(screen, /id="screen-pause" aria-pressed="true" hidden/);
  assert.match(screen, /id="screen-panel" tabindex="0"/);
  assert.doesNotMatch(renderScreen({ screen: { auto_scroll: true } }, categories, 'en'), /aria-pressed="true" hidden/);
});

test('Cloudflare runtime preserves the public site and owner dashboard', { timeout: 180000 }, async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lmit-worker-test-'));
  const email = 'test-owner';
  const password = crypto.randomBytes(18).toString('hex');
  const changedPassword = crypto.randomBytes(18).toString('hex');
  const setupKey = crypto.randomBytes(32).toString('hex');
  const base = 'http://127.0.0.1:8790';
  let child;
  let logs = '';
  let cookie = '';
  let csrf = '';
  let persistentImage;
  async function start() {
    child = spawn(process.execPath, [
      'node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8790',
      '--persist-to', dir, '--var', `ADMIN_EMAIL:${email}`, '--var', `ADMIN_PASSWORD:${password}`, '--var', `ADMIN_SETUP_KEY:${setupKey}`,
    ], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
    child.stdout.on('data', (data) => { logs += data; });
    child.stderr.on('data', (data) => { logs += data; });
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error(`Worker exited: ${logs}`);
      try {
        const response = await fetch(base + '/healthz', { signal: AbortSignal.timeout(1000) });
        if (response.ok) return;
      } catch { /* runtime is still starting */ }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Worker did not start: ${logs}`);
  }
  async function stop() {
    if (child && child.exitCode === null) {
      child.kill('SIGTERM');
      await once(child, 'exit');
    }
  }
  const request = async (url, { method = 'GET', body, auth = true, headers = {} } = {}) => {
    const h = { ...(auth ? { cookie, 'x-csrf-token': csrf } : {}), ...headers };
    if (body !== undefined && !(body instanceof FormData)) h['Content-Type'] = 'application/json';
    const response = await fetch(base + url, {
      method, headers: h, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return { status: response.status, data, headers: response.headers };
  };
  const login = async (pw = password) => {
    const response = await request('/api/admin/login', { method: 'POST', auth: false, body: { email, password: pw } });
    assert.equal(response.status, 200);
    cookie = response.headers.get('set-cookie').split(';')[0];
    csrf = response.data.csrf;
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    return response;
  };
  try {
    await start();
    await t.test('Arabic and English home/menu, static assets and localized 404s', async () => {
      for (const [url, lang, dir] of [['/', 'ar', 'rtl'], ['/en', 'en', 'ltr'], ['/menu', 'ar', 'rtl'], ['/en/menu', 'en', 'ltr'], ['/screen', 'ar', 'rtl'], ['/en/screen', 'en', 'ltr']]) {
        const response = await fetch(base + url);
        assert.equal(response.status, 200, url);
        const html = await response.text();
        assert.match(html, new RegExp(`<html lang="${lang}" dir="${dir}">`));
        if (url.includes('menu')) { assert.doesNotMatch(html, /data-add=|id="cart-bar"/); assert.match(html, /class="menu-photo/); }
        if (url.includes('screen')) assert.match(html, /screen-pause/);
        assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
      }
      for (const url of ['/admin', '/admin/', '/admin/admin.js', '/css/site.css', '/fonts/jost.woff']) {
        assert.equal((await fetch(base + url)).status, 200, url);
      }
      assert.equal((await fetch(base + '/en/not-a-page')).status, 404);
      assert.equal((await fetch(base + '/', { method: 'HEAD' })).status, 200);
      assert.equal((await fetch(base + '/api/menu', { method: 'PATCH' })).status, 405);
      const { data } = await request('/api/menu');
      assert.equal(data.categories.length, 5);
      assert.equal(data.categories.flatMap((c) => c.products).length, 41);
    });
    await t.test('Owner setup requires its secret and becomes permanently unavailable after account creation', async () => {
      const authorization = `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
      assert.equal((await request('/api/admin/bootstrap', { method: 'POST', auth: false, headers: { authorization } })).status, 403);
      assert.equal((await request('/api/admin/bootstrap', { method: 'POST', auth: false, headers: { authorization, 'x-setup-key': setupKey } })).status, 200);
      assert.equal((await request('/api/admin/bootstrap', { method: 'POST', auth: false, headers: { authorization, 'x-setup-key': setupKey } })).status, 409);
      assert.equal((await request('/api/admin/login', { method: 'POST', auth: false, headers: { authorization } })).status, 200);
    });
    await t.test('Login, unknown account, CSRF and same-origin protections', async () => {
      assert.equal((await request('/api/admin/me', { auth: false })).status, 401);
      assert.equal((await request('/api/admin/login', { method: 'POST', auth: false, body: { email, password: 'wrong-password' } })).status, 401);
      await login();
      assert.equal((await request('/api/admin/me')).data.user.email, email);
      assert.equal((await request('/api/admin/products/1', { method: 'PUT', body: { price: 12 }, headers: { 'x-csrf-token': '' } })).status, 403);
      assert.equal((await request('/api/admin/products/1', { method: 'PUT', body: { price: 12 }, headers: { Origin: 'https://foreign.invalid' } })).status, 403);
    });
    await t.test('Price and availability changes are reflected in the customer menu', async () => {
      const original = (await request('/api/admin/products/1')).data.product;
      const result = await request('/api/admin/products/1', { method: 'PUT', body: { price: 12.34, available: false } });
      assert.equal(result.status, 200);
      assert.equal(result.data.product.price, 12.34);
      const item = (await request('/api/menu')).data.categories.flatMap((c) => c.products).find((p) => p.id === 1);
      assert.equal(item.price, 12.34); assert.equal(item.available, false);
      await request('/api/admin/products/1', { method: 'PUT', body: { price: original.price, available: original.available } });
    });
    await t.test('Only admin can enable screen auto-scroll; default is manual', async () => {
      assert.equal((await request('/api/site')).data.screen.auto_scroll, false);
      assert.equal((await request('/api/admin/settings', { method: 'PUT', auth: false, body: { screen: { auto_scroll: true } } })).status, 401);
      assert.equal((await request('/api/admin/settings', { method: 'PUT', body: { screen: { auto_scroll: true } } })).status, 200);
      assert.equal((await request('/api/site')).data.screen.auto_scroll, true);
      assert.equal((await request('/api/admin/settings', { method: 'PUT', body: { screen: { auto_scroll: false } } })).status, 200);
      assert.equal((await request('/api/site')).data.screen.auto_scroll, false);
    });
    await t.test('Categories, products, variants, extras, reorder and protected deletion', async () => {
      const category = (await request('/api/admin/categories', { method: 'POST', body: { name_ar: 'قسم اختبار', name_en: 'Test category' } })).data.category;
      const response = await request('/api/admin/products', { method: 'POST', body: {
        category_id: category.id, name_ar: 'صنف اختبار', name_en: 'Test item', price: 4.75,
        variants: [{ name_ar: 'كبير', name_en: 'Large', price_delta: 1.25 }],
        extras: [{ name_ar: 'إضافة', name_en: 'Extra', price: 0.5 }],
      } });
      assert.equal(response.status, 200);
      const item = response.data.product;
      assert.equal(item.variants[0].price_delta, 1.25);
      assert.equal(item.extras[0].price, 0.5);
      assert.equal((await request(`/api/admin/categories/${category.id}`, { method: 'DELETE' })).status, 409);
      assert.equal((await request('/api/admin/products/reorder', { method: 'POST', body: { category_id: category.id, ids: [item.id] } })).status, 200);
      const updated = await request(`/api/admin/products/${item.id}`, { method: 'PUT', body: { name_en: 'Updated test item', variants: [], extras: [] } });
      assert.equal(updated.data.product.name_en, 'Updated test item');
      assert.deepEqual(updated.data.product.variants, []);
      assert.deepEqual(updated.data.product.extras, []);
      assert.equal((await request(`/api/admin/products/${item.id}`, { method: 'DELETE' })).status, 200);
      assert.equal((await request(`/api/admin/categories/${category.id}`, { method: 'DELETE' })).status, 200);
    });
    await t.test('Real image upload, durable bytes, metadata, attachment and in-use deletion checks', async () => {
      const form = new FormData();
      form.set('file', new Blob([png()], { type: 'image/png' }), 'test.png');
      form.set('purpose', 'product');
      const response = await request('/api/admin/media', { method: 'POST', body: form });
      assert.equal(response.status, 200, JSON.stringify(response.data));
      const media = response.data.media;
      const imageUrl = `/media/${media.key}-orig.png`;
      const image = await fetch(base + imageUrl);
      assert.equal(image.status, 200);
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), png());
      assert.equal((await fetch(base + imageUrl, { headers: { 'if-none-match': `"${media.key}"` } })).status, 304);
      assert.equal((await request(`/api/admin/media/${media.id}`, { method: 'PUT', body: { alt_en: 'Test image' } })).data.media.alt_en, 'Test image');
      await request('/api/admin/products/1', { method: 'PUT', body: { image_id: media.id } });
      assert.equal((await request(`/api/admin/media/${media.id}`, { method: 'DELETE' })).status, 409);
      assert.equal((await request(`/api/admin/media/${media.id}?force=1`, { method: 'DELETE' })).status, 200);
      assert.equal((await fetch(base + imageUrl)).status, 404);
      assert.equal((await request('/api/admin/products/1')).data.product.image, null);
    });
    await t.test('Fake images and corrupted PNGs are rejected', async () => {
      for (const data of [Buffer.from('not an image'), Buffer.concat([png().subarray(0, 30), Buffer.from('fake')]), Buffer.concat([png(), Buffer.from('trailing payload')])]) {
        const form = new FormData();
        form.set('file', new Blob([data], { type: 'image/png' }), 'fake.png');
        assert.equal((await request('/api/admin/media', { method: 'POST', body: form })).status, 422);
      }
    });
    await t.test('Photos larger than one SQLite chunk are stored intact', async () => {
      const data = png(300, 700, true);
      assert.ok(data.length > 512 * 1024);
      const form = new FormData();
      form.set('file', new Blob([data], { type: 'image/png' }), 'multi-chunk.png');
      const uploaded = await request('/api/admin/media', { method: 'POST', body: form });
      assert.equal(uploaded.status, 200, JSON.stringify(uploaded.data));
      persistentImage = { url: `/media/${uploaded.data.media.key}-orig.png`, data };
      const result = await fetch(base + persistentImage.url);
      assert.deepEqual(Buffer.from(await result.arrayBuffer()), data);
    });
    await t.test('Settings and promotions save while orders remain disabled', async () => {
      const original = (await request('/api/admin/settings')).data.settings;
      const update = await request('/api/admin/settings', { method: 'PUT', body: {
        business: { ...original.business, address_en: 'Persistence test address' },
        hours: original.hours, orders: { enabled: true },
      } });
      assert.equal(update.status, 200);
      assert.equal(update.data.settings.orders.enabled, false);
      assert.equal((await request('/api/orders', { method: 'POST', body: {} })).status, 403);
      assert.equal((await request('/api/site')).data.business.address_en, 'Persistence test address');
      const promo = await request('/api/admin/promotions', { method: 'POST', body: { title_ar: 'اختبار', title_en: 'Test promotion' } });
      assert.equal(promo.status, 200);
      assert.equal((await request(`/api/admin/promotions/${promo.data.id}`, { method: 'PUT', body: { active: false } })).status, 200);
      assert.equal((await request(`/api/admin/promotions/${promo.data.id}`, { method: 'DELETE' })).status, 200);
    });
    await t.test('Password changes reject the wrong current password and allow a new login', async () => {
      assert.equal((await request('/api/admin/password', { method: 'POST', body: { current: 'incorrect-current', next: changedPassword } })).status, 400);
      assert.equal((await request('/api/admin/password', { method: 'POST', body: { current: password, next: changedPassword } })).status, 200);
      await request('/api/admin/logout', { method: 'POST' });
      assert.equal((await request('/api/admin/me')).status, 401);
      await login(changedPassword);
    });
    await t.test('Restart preserves owner content, password and session without reseeding', async () => {
      await stop();
      await start();
      assert.equal((await request('/api/site')).data.business.address_en, 'Persistence test address');
      assert.equal((await request('/api/admin/me')).status, 200);
      const image = await fetch(base + persistentImage.url);
      assert.equal(image.status, 200);
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), persistentImage.data);
      await login(changedPassword);
    });
    await t.test('Content export and overview work without exposing authentication secrets', async () => {
      const backup = await request('/api/admin/export');
      assert.equal(backup.status, 200);
      assert.match(backup.headers.get('content-disposition'), /lmit-backup.json/);
      assert.ok(backup.data.products.length === 41);
      assert.equal(backup.data.users, undefined);
      assert.equal(backup.data.sessions, undefined);
      const stats = await request('/api/admin/stats');
      assert.equal(stats.status, 200);
      assert.equal(stats.data.products, 41);
    });
    await t.test('Login rate limits are enforced with Retry-After', async () => {
      let response;
      for (let i = 0; i < 7; i++) response = await request('/api/admin/login', {
        method: 'POST', auth: false, body: { email: 'unknown@example.invalid', password: 'incorrect-password' },
      });
      assert.equal(response.status, 429);
      assert.ok(Number(response.headers.get('retry-after')) > 0);
    });
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
