import { one, all, run, tx, getSetting, getVersion, toSar } from './db.js';
import { HttpError, readJson, vStr, vInt, bad400, clientIp, sameOriginOrNone } from './http.js';
import { rateLimit } from './auth.js';
import { publicMenu, publicSite, riyadhToday } from './model.js';
import { subscribe, broadcast, clientCount } from './events.js';

function etagged(req, res, build, headers = {}) {
  const tag = `W/"v${getVersion()}"`;
  if (req.headers['if-none-match'] === tag) { res.writeHead(304, { ETag: tag, 'Cache-Control': 'no-cache' }); res.end(); return undefined; }
  res.setHeader('ETag', tag);
  res.setHeader('Cache-Control', 'no-cache');
  return build();
}

export function register(add) {
  add('GET', '/healthz', () => ({ ok: true, version: getVersion(), live_clients: clientCount() }));

  add('GET', '/api/menu', ({ req, res }) => etagged(req, res, () => ({ version: getVersion(), categories: publicMenu() })));
  add('GET', '/api/site', ({ req, res }) => etagged(req, res, () => ({ version: getVersion(), ...publicSite() })));

  add('GET', '/api/stream', ({ req, res }) => { subscribe(req, res, getVersion()); return undefined; }, { raw: true });

  add('POST', '/api/orders', async ({ req }) => {
    sameOriginOrNone(req);
    const settings = getSetting('orders', { enabled: false });
    if (!settings.enabled) throw new HttpError(403, 'orders_closed', 'Online orders are not open right now.');
    rateLimit(`order:${clientIp(req)}`, 6, 10 * 60_000);
    const b = await readJson(req, 20_000);
    if (!Array.isArray(b.items) || !b.items.length) throw bad400('items', 'required', 'Add at least one item.');
    if (b.items.length > 30) throw bad400('items', 'invalid', 'Too many items in one order.');
    const name = vStr(b.name, 'name', { max: 60, req: true });
    const phone = vStr(b.phone, 'phone', { max: 20 });
    if (phone && !/^[0-9+\s]{7,20}$/.test(phone)) throw bad400('phone', 'invalid', 'Phone number is not valid.');
    const note = vStr(b.note, 'note', { max: 200 });

    const lines = b.items.map((it, i) => {
      const pid = vInt(it.product_id, `items.${i}.product_id`, { min: 1, req: true });
      const qty = vInt(it.qty, `items.${i}.qty`, { min: 1, max: 20, req: true });
      const p = one(
        `SELECT p.*, c.active AS cat_active FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=?`, pid
      );
      if (!p || !p.cat_active) throw bad400(`items.${i}`, 'invalid', 'An item is no longer on the menu.');
      if (!p.available) throw bad400(`items.${i}`, 'unavailable', 'An item is sold out.', { product_id: pid });
      const variants = all('SELECT * FROM variants WHERE product_id=? ORDER BY sort,id', pid);
      let variant = null;
      if (variants.length) {
        variant = variants.find((v) => v.id === Number(it.variant_id));
        if (!variant) throw bad400(`items.${i}.variant_id`, 'required', 'Choose an option.');
      }
      const extraIds = Array.isArray(it.extra_ids) ? it.extra_ids.map(Number) : [];
      const extras = extraIds.length ? all('SELECT * FROM extras WHERE product_id=? ORDER BY sort,id', pid).filter((e) => extraIds.includes(e.id)) : [];
      const unit = p.price + (variant ? variant.price_delta : 0) + extras.reduce((s, e) => s + e.price, 0);
      return { p, qty, variant, extras, unit };
    });
    const total = lines.reduce((s, l) => s + l.unit * l.qty, 0);

    const out = tx(() => {
      const day = riyadhToday();
      const seq = one('SELECT COALESCE(MAX(seq),0)+1 n FROM orders WHERE day=?', day).n;
      const r = run('INSERT INTO orders(day,seq,name,phone,note,total) VALUES(?,?,?,?,?,?)', day, seq, name, phone, note, total);
      const oid = Number(r.lastInsertRowid);
      for (const l of lines) {
        run(
          `INSERT INTO order_items(order_id,product_id,name_ar,name_en,variant_ar,variant_en,extras_ar,extras_en,qty,unit_price) VALUES(?,?,?,?,?,?,?,?,?,?)`,
          oid, l.p.id, l.p.name_ar, l.p.name_en, l.variant ? l.variant.name_ar : '', l.variant ? l.variant.name_en : '',
          l.extras.map((e) => e.name_ar).join('، '), l.extras.map((e) => e.name_en).join(', '), l.qty, l.unit
        );
      }
      return { number: seq, id: oid };
    });
    broadcast('orders', getVersion());
    return { ok: true, number: out.number, total: toSar(total) };
  });
}
