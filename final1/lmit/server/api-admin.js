import fs from 'node:fs';
import { one, all, run, tx, allSettings, setSetting, toSar } from './db.js';
import { HttpError, readJson, vStr, vInt, vMoney, vBool, vEnum, vUrl, bad400 } from './http.js';
import {
  login, requireAdmin, currentUser, destroySession, destroyOtherSessions, sameOrigin,
  verifyPassword, hashPassword, checkPasswordPolicy, rateLimit,
} from './auth.js';
import { parseMultipart } from './multipart.js';
import { storeImage, deleteMediaFiles, mediaObject, isPurpose } from './images.js';
import { MAX_UPLOAD_BYTES } from './config.js';
import { listCategories, listProducts, getProduct, getCategory, listPromotions, audit } from './model.js';
import { normalizeSetting } from './settings.js';
import { commit } from './content.js';

const ACCENTS = ['brass', 'sage', 'terracotta', 'teal', 'olive'];
const ORDER_STATUS = ['new', 'preparing', 'ready', 'done', 'cancelled'];
const names = (o) => ({ name_ar: o.name_ar || o.title_ar || '', name_en: o.name_en || o.title_en || '' });

function slugify(s) {
  const base = String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return base || 'category';
}
function uniqueSlug(base, ignoreId = 0) {
  let slug = base;
  let n = 2;
  while (one('SELECT id FROM categories WHERE slug=? AND id<>?', slug, ignoreId)) slug = `${base}-${n++}`;
  return slug;
}
function mediaIdOrNull(v, field) {
  if (v === undefined) return undefined;
  if (v === null || v === '' || v === 0) return null;
  const id = vInt(v, field, { min: 1 });
  if (!one('SELECT id FROM media WHERE id=?', id)) throw bad400(field, 'invalid', 'That image no longer exists.');
  return id;
}
const idParam = (p) => {
  const id = Number(p.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'not_found', 'Not found.');
  return id;
};

export function register(add) {
  const admin = (fn) => async (ctx) => { ctx.user = requireAdmin(ctx.req); return fn(ctx); };

  // ---------- session ----------
  add('POST', '/api/admin/login', async ({ req, res }) => {
    sameOrigin(req);
    const body = await readJson(req, 10_000);
    const email = vStr(body.email, 'email', { max: 200, req: true });
    const password = vStr(body.password, 'password', { max: 200, req: true });
    return login(req, res, email, password);
  });
  add('POST', '/api/admin/logout', async ({ req, res }) => {
    sameOrigin(req);
    destroySession(req, res);
    return { ok: true };
  });
  add('GET', '/api/admin/me', ({ req }) => {
    const u = currentUser(req);
    if (!u) throw new HttpError(401, 'unauthorized', 'Sign in to continue.');
    return { user: { id: u.id, email: u.email }, csrf: u.csrf };
  });
  add('POST', '/api/admin/password', admin(async ({ req, user }) => {
    const body = await readJson(req, 10_000);
    const cur = vStr(body.current, 'current', { max: 200, req: true });
    const next = vStr(body.next, 'next', { max: 200, req: true });
    rateLimit(`pw:${user.id}`, 8, 15 * 60_000);
    const row = one('SELECT pass FROM users WHERE id=?', user.id);
    if (!verifyPassword(cur, row.pass)) throw new HttpError(400, 'bad_credentials', 'Current password is not correct.', { field: 'current' });
    checkPasswordPolicy(next);
    run('UPDATE users SET pass=? WHERE id=?', hashPassword(next), user.id);
    destroyOtherSessions(req, user.id);
    audit(user, 'account.password', 'account', user.id);
    return { ok: true };
  }));

  // ---------- overview ----------
  add('GET', '/api/admin/stats', admin(() => {
    const c = (sql) => one(sql).n;
    return {
      products: c('SELECT COUNT(*) n FROM products'),
      available: c('SELECT COUNT(*) n FROM products WHERE available=1'),
      unavailable: c('SELECT COUNT(*) n FROM products WHERE available=0'),
      featured: c('SELECT COUNT(*) n FROM products WHERE featured=1'),
      bestsellers: c('SELECT COUNT(*) n FROM products WHERE bestseller=1'),
      categories: c('SELECT COUNT(*) n FROM categories'),
      active_categories: c('SELECT COUNT(*) n FROM categories WHERE active=1'),
      media: c('SELECT COUNT(*) n FROM media'),
      new_orders: c("SELECT COUNT(*) n FROM orders WHERE status='new'"),
      recent: all('SELECT * FROM audit ORDER BY id DESC LIMIT 12').map((r) => ({ ...r, detail: JSON.parse(r.detail || '{}') })),
    };
  }));

  add('GET', '/api/admin/export', admin(({ req, res }) => {
    const data = {
      exported_at: new Date().toISOString(),
      categories: listCategories(), products: listProducts(), promotions: listPromotions(), settings: allSettings(),
    };
    res.setHeader('Content-Disposition', 'attachment; filename="lmit-backup.json"');
    return data;
  }));

  // ---------- categories ----------
  add('GET', '/api/admin/categories', admin(() => ({ categories: listCategories() })));

  const readCategory = (b, cur = null) => {
    const out = {};
    const has = (k) => b[k] !== undefined;
    if (!cur || has('name_ar')) out.name_ar = vStr(b.name_ar, 'name_ar', { max: 80, req: true });
    if (!cur || has('name_en')) out.name_en = vStr(b.name_en, 'name_en', { max: 80 });
    if (has('desc_ar')) out.desc_ar = vStr(b.desc_ar, 'desc_ar', { max: 200 });
    if (has('desc_en')) out.desc_en = vStr(b.desc_en, 'desc_en', { max: 200 });
    if (has('accent')) out.accent = vEnum(b.accent, 'accent', ACCENTS, 'brass');
    if (has('active')) out.active = vBool(b.active);
    if (has('image_id')) out.image_id = mediaIdOrNull(b.image_id, 'image_id');
    return out;
  };

  add('POST', '/api/admin/categories', admin(async ({ req, user }) => {
    const b = await readJson(req);
    const f = readCategory(b);
    const slug = uniqueSlug(slugify(vStr(b.slug, 'slug', { max: 40 }) || f.name_en || 'category'));
    const sort = (one('SELECT COALESCE(MAX(sort),0)+1 n FROM categories').n);
    const r = run(
      'INSERT INTO categories(slug,name_ar,name_en,desc_ar,desc_en,image_id,accent,sort,active) VALUES(?,?,?,?,?,?,?,?,?)',
      slug, f.name_ar, f.name_en || '', f.desc_ar || '', f.desc_en || '', f.image_id ?? null, f.accent || 'brass', sort, f.active ?? 1
    );
    const id = Number(r.lastInsertRowid);
    audit(user, 'category.create', 'category', id, names(f));
    commit();
    return { category: getCategory(id) };
  }));

  add('PUT', '/api/admin/categories/:id', admin(async ({ req, params, user }) => {
    const id = idParam(params);
    const cur = one('SELECT * FROM categories WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Category not found.');
    const f = readCategory(await readJson(req), cur);
    const keys = Object.keys(f);
    if (keys.length) {
      run(`UPDATE categories SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`, ...keys.map((k) => f[k]), id);
      audit(user, 'category.update', 'category', id, names({ ...cur, ...f }), { changed: keys });
      commit();
    }
    return { category: getCategory(id) };
  }));

  add('DELETE', '/api/admin/categories/:id', admin(({ params, query, user }) => {
    const id = idParam(params);
    const cur = one('SELECT * FROM categories WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Category not found.');
    const count = one('SELECT COUNT(*) n FROM products WHERE category_id=?', id).n;
    if (count > 0 && query.get('force') !== '1') {
      throw new HttpError(409, 'category_not_empty', 'This category still has products.', { count });
    }
    run('DELETE FROM categories WHERE id=?', id);
    audit(user, 'category.delete', 'category', id, names(cur), { products_deleted: count });
    commit();
    return { ok: true, products_deleted: count };
  }));

  add('POST', '/api/admin/categories/reorder', admin(async ({ req, user }) => {
    const { ids } = await readJson(req);
    if (!Array.isArray(ids)) throw bad400('ids', 'invalid', 'ids must be a list.');
    tx(() => ids.forEach((id, i) => run('UPDATE categories SET sort=? WHERE id=?', i + 1, vInt(id, 'ids', { min: 1 }))));
    audit(user, 'category.reorder', 'category', null);
    commit();
    return { categories: listCategories() };
  }));

  // ---------- products ----------
  add('GET', '/api/admin/products', admin(({ query }) => {
    const cat = query.get('category_id') ? vInt(query.get('category_id'), 'category_id', { min: 1 }) : null;
    return { products: listProducts({ categoryId: cat, q: (query.get('q') || '').trim().slice(0, 80) }) };
  }));
  add('GET', '/api/admin/products/:id', admin(({ params }) => {
    const p = getProduct(idParam(params));
    if (!p) throw new HttpError(404, 'not_found', 'Product not found.');
    return { product: p };
  }));

  const readLists = (b) => {
    const out = {};
    if (b.variants !== undefined) {
      if (!Array.isArray(b.variants) || b.variants.length > 12) throw bad400('variants', 'invalid', 'Use at most 12 options.');
      out.variants = b.variants.map((v, i) => ({
        name_ar: vStr(v.name_ar, `variants.${i}.name_ar`, { max: 60, req: true }),
        name_en: vStr(v.name_en, `variants.${i}.name_en`, { max: 60 }),
        price_delta: vMoney(v.price_delta, `variants.${i}.price_delta`, { min: -1000, max: 1000 }),
      }));
    }
    if (b.extras !== undefined) {
      if (!Array.isArray(b.extras) || b.extras.length > 20) throw bad400('extras', 'invalid', 'Use at most 20 extras.');
      out.extras = b.extras.map((v, i) => ({
        name_ar: vStr(v.name_ar, `extras.${i}.name_ar`, { max: 60, req: true }),
        name_en: vStr(v.name_en, `extras.${i}.name_en`, { max: 60 }),
        price: vMoney(v.price, `extras.${i}.price`, { min: 0, max: 1000 }),
      }));
    }
    return out;
  };

  const readProduct = (b, cur = null) => {
    const out = {};
    const has = (k) => b[k] !== undefined;
    if (!cur || has('category_id')) {
      const cid = vInt(b.category_id, 'category_id', { min: 1, req: true });
      if (!one('SELECT id FROM categories WHERE id=?', cid)) throw bad400('category_id', 'invalid', 'Choose a category.');
      out.category_id = cid;
    }
    if (!cur || has('name_ar')) out.name_ar = vStr(b.name_ar, 'name_ar', { max: 120, req: true });
    if (!cur || has('name_en')) out.name_en = vStr(b.name_en, 'name_en', { max: 120 });
    if (has('desc_ar')) out.desc_ar = vStr(b.desc_ar, 'desc_ar', { max: 500 });
    if (has('desc_en')) out.desc_en = vStr(b.desc_en, 'desc_en', { max: 500 });
    if (!cur || has('price')) out.price = vMoney(b.price, 'price', { min: 0, max: 10000, req: true });
    if (has('image_id')) out.image_id = mediaIdOrNull(b.image_id, 'image_id');
    for (const k of ['available', 'featured', 'bestseller']) if (has(k)) out[k] = vBool(b[k]);
    return out;
  };

  const writeLists = (pid, lists) => {
    if (lists.variants) {
      run('DELETE FROM variants WHERE product_id=?', pid);
      lists.variants.forEach((v, i) => run('INSERT INTO variants(product_id,name_ar,name_en,price_delta,sort) VALUES(?,?,?,?,?)', pid, v.name_ar, v.name_en, v.price_delta, i + 1));
    }
    if (lists.extras) {
      run('DELETE FROM extras WHERE product_id=?', pid);
      lists.extras.forEach((v, i) => run('INSERT INTO extras(product_id,name_ar,name_en,price,sort) VALUES(?,?,?,?,?)', pid, v.name_ar, v.name_en, v.price, i + 1));
    }
  };

  add('POST', '/api/admin/products', admin(async ({ req, user }) => {
    const b = await readJson(req);
    const f = readProduct(b);
    const lists = readLists(b);
    const id = tx(() => {
      const sort = one('SELECT COALESCE(MAX(sort),0)+1 n FROM products WHERE category_id=?', f.category_id).n;
      const r = run(
        `INSERT INTO products(category_id,name_ar,name_en,desc_ar,desc_en,price,image_id,available,featured,bestseller,sort)
         VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        f.category_id, f.name_ar, f.name_en || '', f.desc_ar || '', f.desc_en || '', f.price, f.image_id ?? null,
        f.available ?? 1, f.featured ?? 0, f.bestseller ?? 0, sort
      );
      const pid = Number(r.lastInsertRowid);
      writeLists(pid, lists);
      return pid;
    });
    audit(user, 'product.create', 'product', id, names(f), { price: toSar(f.price) });
    commit();
    return { product: getProduct(id) };
  }));

  add('PUT', '/api/admin/products/:id', admin(async ({ req, params, user }) => {
    const id = idParam(params);
    const cur = one('SELECT * FROM products WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Product not found.');
    const b = await readJson(req);
    const f = readProduct(b, cur);
    const lists = readLists(b);
    const keys = Object.keys(f);
    tx(() => {
      if (keys.length) {
        run(`UPDATE products SET ${keys.map((k) => `${k}=?`).join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`, ...keys.map((k) => f[k]), id);
        if (f.category_id && f.category_id !== cur.category_id) {
          run('UPDATE products SET sort=(SELECT COALESCE(MAX(sort),0)+1 FROM products WHERE category_id=?) WHERE id=?', f.category_id, id);
        }
      } else if (lists.variants || lists.extras) {
        run('UPDATE products SET updated_at=CURRENT_TIMESTAMP WHERE id=?', id);
      }
      writeLists(id, lists);
    });
    const detail = { changed: [...keys, ...Object.keys(lists)] };
    if (f.price !== undefined && f.price !== cur.price) detail.price = { from: toSar(cur.price), to: toSar(f.price) };
    if (f.available !== undefined && f.available !== cur.available) detail.available = !!f.available;
    if (detail.changed.length) {
      audit(user, detail.price ? 'product.price' : 'product.update', 'product', id, names({ ...cur, ...f }), detail);
      commit();
    }
    return { product: getProduct(id) };
  }));

  add('DELETE', '/api/admin/products/:id', admin(({ params, user }) => {
    const id = idParam(params);
    const cur = one('SELECT * FROM products WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Product not found.');
    run('DELETE FROM products WHERE id=?', id);
    audit(user, 'product.delete', 'product', id, names(cur));
    commit();
    return { ok: true };
  }));

  add('POST', '/api/admin/products/reorder', admin(async ({ req, user }) => {
    const b = await readJson(req);
    const cid = vInt(b.category_id, 'category_id', { min: 1, req: true });
    if (!Array.isArray(b.ids)) throw bad400('ids', 'invalid', 'ids must be a list.');
    tx(() => b.ids.forEach((pid, i) => run('UPDATE products SET sort=? WHERE id=? AND category_id=?', i + 1, vInt(pid, 'ids', { min: 1 }), cid)));
    const cat = one('SELECT * FROM categories WHERE id=?', cid);
    audit(user, 'product.reorder', 'category', cid, cat ? names(cat) : {});
    commit();
    return { products: listProducts({ categoryId: cid }) };
  }));

  // ---------- media ----------
  add('GET', '/api/admin/media', admin(({ query }) => {
    const purpose = query.get('purpose');
    const rows = purpose && isPurpose(purpose)
      ? all('SELECT * FROM media WHERE purpose=? ORDER BY id DESC', purpose)
      : all('SELECT * FROM media ORDER BY id DESC');
    return { media: rows.map(mediaObject) };
  }));

  add('POST', '/api/admin/media', admin(async ({ req, user }) => {
    const { fields, files } = await parseMultipart(req, MAX_UPLOAD_BYTES);
    const f = files.find((x) => x.name === 'file');
    const row = await storeImage(f && f.data, {
      purpose: fields.purpose, alt_ar: vStr(fields.alt_ar, 'alt_ar', { max: 200 }), alt_en: vStr(fields.alt_en, 'alt_en', { max: 200 }),
    });
    audit(user, 'media.upload', 'media', row.id, {}, { purpose: row.purpose });
    commit();
    return { media: mediaObject(row) };
  }));

  add('PUT', '/api/admin/media/:id', admin(async ({ req, params, user }) => {
    const id = idParam(params);
    const b = await readJson(req, 20_000);
    const cur = one('SELECT * FROM media WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Image not found.');
    const purpose = b.purpose !== undefined ? vEnum(b.purpose, 'purpose', ['product', 'category', 'banner', 'promo', 'seasonal', 'gallery', 'general'], cur.purpose) : cur.purpose;
    run('UPDATE media SET alt_ar=?, alt_en=?, purpose=? WHERE id=?',
      b.alt_ar !== undefined ? vStr(b.alt_ar, 'alt_ar', { max: 200 }) : cur.alt_ar,
      b.alt_en !== undefined ? vStr(b.alt_en, 'alt_en', { max: 200 }) : cur.alt_en, purpose, id);
    audit(user, 'media.update', 'media', id);
    commit();
    return { media: mediaObject(one('SELECT * FROM media WHERE id=?', id)) };
  }));

  add('DELETE', '/api/admin/media/:id', admin(({ params, query, user }) => {
    const id = idParam(params);
    const cur = one('SELECT * FROM media WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Image not found.');
    const used = [
      ...all('SELECT id,name_ar,name_en FROM products WHERE image_id=?', id).map((r) => ({ type: 'product', ...r })),
      ...all('SELECT id,name_ar,name_en FROM categories WHERE image_id=?', id).map((r) => ({ type: 'category', ...r })),
      ...all('SELECT id,title_ar AS name_ar,title_en AS name_en FROM promotions WHERE image_id=?', id).map((r) => ({ type: 'promotion', ...r })),
    ];
    const s = allSettings();
    if (s.hero && s.hero.image_id === id) used.push({ type: 'hero', id: 0, name_ar: 'الصورة الرئيسية', name_en: 'Homepage photo' });
    if (s.gallery && (s.gallery.image_ids || []).includes(id)) used.push({ type: 'gallery', id: 0, name_ar: 'معرض الصور', name_en: 'Photo gallery' });
    if (used.length && query.get('force') !== '1') throw new HttpError(409, 'media_in_use', 'This image is in use.', { used_by: used });
    tx(() => {
      if (s.hero && s.hero.image_id === id) setSetting('hero', { ...s.hero, image_id: null });
      if (s.gallery && (s.gallery.image_ids || []).includes(id)) setSetting('gallery', { image_ids: s.gallery.image_ids.filter((x) => x !== id) });
      run('DELETE FROM media WHERE id=?', id);
    });
    deleteMediaFiles(cur);
    audit(user, 'media.delete', 'media', id, {}, { used: used.length });
    commit();
    return { ok: true };
  }));

  // ---------- promotions ----------
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const vDate = (v, field) => {
    const s = vStr(v, field, { max: 10 });
    if (s && !DATE.test(s)) throw bad400(field, 'invalid', 'Use a date like 2026-12-31.');
    return s;
  };
  const readPromo = (b, cur = null) => {
    const out = {};
    const has = (k) => b[k] !== undefined;
    for (const k of ['title_ar', 'title_en']) if (!cur || has(k)) out[k] = vStr(b[k], k, { max: 100, req: k === 'title_ar' });
    for (const k of ['text_ar', 'text_en']) if (has(k)) out[k] = vStr(b[k], k, { max: 300 });
    for (const k of ['cta_ar', 'cta_en']) if (has(k)) out[k] = vStr(b[k], k, { max: 40 });
    if (has('link_url')) out.link_url = vUrl(b.link_url, 'link_url');
    if (has('image_id')) out.image_id = mediaIdOrNull(b.image_id, 'image_id');
    if (has('active')) out.active = vBool(b.active);
    if (has('starts_at')) out.starts_at = vDate(b.starts_at, 'starts_at');
    if (has('ends_at')) out.ends_at = vDate(b.ends_at, 'ends_at');
    return out;
  };
  add('GET', '/api/admin/promotions', admin(() => ({ promotions: listPromotions() })));
  add('POST', '/api/admin/promotions', admin(async ({ req, user }) => {
    const f = readPromo(await readJson(req));
    const sort = one('SELECT COALESCE(MAX(sort),0)+1 n FROM promotions').n;
    const r = run(
      `INSERT INTO promotions(title_ar,title_en,text_ar,text_en,image_id,link_url,cta_ar,cta_en,active,starts_at,ends_at,sort) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      f.title_ar, f.title_en || '', f.text_ar || '', f.text_en || '', f.image_id ?? null, f.link_url || '', f.cta_ar || '', f.cta_en || '',
      f.active ?? 1, f.starts_at || '', f.ends_at || '', sort
    );
    const id = Number(r.lastInsertRowid);
    audit(user, 'promotion.create', 'promotion', id, names(f));
    commit();
    return { promotions: listPromotions(), id };
  }));
  add('PUT', '/api/admin/promotions/:id', admin(async ({ req, params, user }) => {
    const id = idParam(params);
    const cur = one('SELECT * FROM promotions WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Promotion not found.');
    const f = readPromo(await readJson(req), cur);
    const keys = Object.keys(f);
    if (keys.length) {
      run(`UPDATE promotions SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=?`, ...keys.map((k) => f[k]), id);
      audit(user, 'promotion.update', 'promotion', id, names({ ...cur, ...f }), { changed: keys });
      commit();
    }
    return { promotions: listPromotions() };
  }));
  add('DELETE', '/api/admin/promotions/:id', admin(({ params, user }) => {
    const id = idParam(params);
    const cur = one('SELECT * FROM promotions WHERE id=?', id);
    if (!cur) throw new HttpError(404, 'not_found', 'Promotion not found.');
    run('DELETE FROM promotions WHERE id=?', id);
    audit(user, 'promotion.delete', 'promotion', id, names(cur));
    commit();
    return { promotions: listPromotions() };
  }));
  add('POST', '/api/admin/promotions/reorder', admin(async ({ req, user }) => {
    const { ids } = await readJson(req);
    if (!Array.isArray(ids)) throw bad400('ids', 'invalid', 'ids must be a list.');
    tx(() => ids.forEach((id, i) => run('UPDATE promotions SET sort=? WHERE id=?', i + 1, vInt(id, 'ids', { min: 1 }))));
    commit();
    return { promotions: listPromotions() };
  }));

  // ---------- site settings ----------
  add('GET', '/api/admin/settings', admin(() => ({ settings: allSettings() })));
  add('PUT', '/api/admin/settings', admin(async ({ req, user }) => {
    const body = await readJson(req, 100_000);
    const keys = Object.keys(body);
    if (!keys.length) throw bad400('settings', 'required', 'Nothing to save.');
    const clean = {};
    for (const k of keys) clean[k] = normalizeSetting(k, body[k]);
    tx(() => { for (const k of keys) setSetting(k, clean[k]); });
    audit(user, 'settings.update', 'settings', null, {}, { keys });
    commit();
    return { settings: allSettings() };
  }));

  // ---------- orders ----------
  add('GET', '/api/admin/orders', admin(() => {
    const orders = all('SELECT * FROM orders ORDER BY id DESC LIMIT 100');
    const items = all(`SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY id DESC LIMIT 100)`);
    return {
      orders: orders.map((o) => ({
        id: o.id, number: o.seq, day: o.day, name: o.name, phone: o.phone, note: o.note, total: toSar(o.total), status: o.status, created_at: o.created_at,
        items: items.filter((i) => i.order_id === o.id).map((i) => ({
          name_ar: i.name_ar, name_en: i.name_en, variant_ar: i.variant_ar, variant_en: i.variant_en,
          extras_ar: i.extras_ar, extras_en: i.extras_en, qty: i.qty, unit_price: toSar(i.unit_price),
        })),
      })),
    };
  }));
  add('PUT', '/api/admin/orders/:id', admin(async ({ req, params, user }) => {
    const id = idParam(params);
    const b = await readJson(req, 5000);
    const status = vEnum(b.status, 'status', ORDER_STATUS, null);
    if (!status) throw bad400('status', 'required', 'Choose a status.');
    const r = run('UPDATE orders SET status=? WHERE id=?', status, id);
    if (!r.changes) throw new HttpError(404, 'not_found', 'Order not found.');
    audit(user, 'order.status', 'order', id, {}, { status });
    return { ok: true };
  }));
}
