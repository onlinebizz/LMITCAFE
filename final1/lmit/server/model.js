import { all, one, run, allSettings, toSar } from './db.js';
import { mediaObject } from './images.js';
import { TIMEZONE } from './config.js';

const IMG = `m.id AS img_id, m.key AS img_key, m.w AS img_w, m.h AS img_h, m.widths AS img_widths, m.ext AS img_ext,
  m.purpose AS img_purpose, m.alt_ar AS img_alt_ar, m.alt_en AS img_alt_en, m.bytes AS img_bytes, m.created_at AS img_created`;

function image(r) {
  if (!r.img_id) return null;
  return mediaObject({
    id: r.img_id, key: r.img_key, w: r.img_w, h: r.img_h, widths: r.img_widths, ext: r.img_ext,
    purpose: r.img_purpose, alt_ar: r.img_alt_ar, alt_en: r.img_alt_en, bytes: r.img_bytes, created_at: r.img_created,
  });
}

const variantOut = (v) => ({ id: v.id, name_ar: v.name_ar, name_en: v.name_en, price_delta: toSar(v.price_delta) });
const extraOut = (e) => ({ id: e.id, name_ar: e.name_ar, name_en: e.name_en, price: toSar(e.price) });

function productOut(p, variants, extras) {
  return {
    id: p.id, category_id: p.category_id,
    name_ar: p.name_ar, name_en: p.name_en, desc_ar: p.desc_ar, desc_en: p.desc_en,
    price: toSar(p.price), image: image(p),
    available: !!p.available, featured: !!p.featured, bestseller: !!p.bestseller, sort: p.sort,
    variants: (variants.get(p.id) || []).map(variantOut),
    extras: (extras.get(p.id) || []).map(extraOut),
    updated_at: p.updated_at,
  };
}

function groupBy(rows) {
  const m = new Map();
  for (const r of rows) { if (!m.has(r.product_id)) m.set(r.product_id, []); m.get(r.product_id).push(r); }
  return m;
}

const categoryOut = (c) => ({
  id: c.id, slug: c.slug, name_ar: c.name_ar, name_en: c.name_en, desc_ar: c.desc_ar, desc_en: c.desc_en,
  accent: c.accent, sort: c.sort, active: !!c.active, image: image(c),
});

export function listCategories({ onlyActive = false } = {}) {
  const rows = all(
    `SELECT c.*, ${IMG}, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS product_count
     FROM categories c LEFT JOIN media m ON m.id=c.image_id
     ${onlyActive ? 'WHERE c.active=1' : ''} ORDER BY c.sort, c.id`
  );
  return rows.map((c) => ({ ...categoryOut(c), product_count: c.product_count }));
}

export function listProducts({ categoryId = null, q = '' } = {}) {
  const where = [];
  const params = [];
  if (categoryId) { where.push('p.category_id=?'); params.push(categoryId); }
  if (q) {
    where.push('(p.name_ar LIKE ? OR p.name_en LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const rows = all(
    `SELECT p.*, ${IMG} FROM products p LEFT JOIN media m ON m.id=p.image_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.category_id, p.sort, p.id`,
    ...params
  );
  const variants = groupBy(all('SELECT * FROM variants ORDER BY sort, id'));
  const extras = groupBy(all('SELECT * FROM extras ORDER BY sort, id'));
  return rows.map((p) => productOut(p, variants, extras));
}

export function getProduct(id) {
  const p = one(`SELECT p.*, ${IMG} FROM products p LEFT JOIN media m ON m.id=p.image_id WHERE p.id=?`, id);
  if (!p) return null;
  const variants = groupBy(all('SELECT * FROM variants WHERE product_id=? ORDER BY sort, id', id));
  const extras = groupBy(all('SELECT * FROM extras WHERE product_id=? ORDER BY sort, id', id));
  return productOut(p, variants, extras);
}

export function getCategory(id) {
  const c = one(`SELECT c.*, ${IMG}, (SELECT COUNT(*) FROM products p WHERE p.category_id=c.id) AS product_count FROM categories c LEFT JOIN media m ON m.id=c.image_id WHERE c.id=?`, id);
  return c ? { ...categoryOut(c), product_count: c.product_count } : null;
}

export function publicMenu() {
  const cats = listCategories({ onlyActive: true });
  const products = listProducts();
  const byCat = new Map();
  for (const p of products) { if (!byCat.has(p.category_id)) byCat.set(p.category_id, []); byCat.get(p.category_id).push(p); }
  return cats.map((c) => ({ ...c, products: byCat.get(c.id) || [] }));
}

export function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function listPromotions({ onlyLive = false } = {}) {
  const rows = all(`SELECT pr.*, ${IMG} FROM promotions pr LEFT JOIN media m ON m.id=pr.image_id ORDER BY pr.sort, pr.id`);
  const today = riyadhToday();
  return rows
    .filter((r) => !onlyLive || (r.active && (!r.starts_at || r.starts_at <= today) && (!r.ends_at || r.ends_at >= today)))
    .map((r) => ({
      id: r.id, title_ar: r.title_ar, title_en: r.title_en, text_ar: r.text_ar, text_en: r.text_en,
      link_url: r.link_url, cta_ar: r.cta_ar, cta_en: r.cta_en, active: !!r.active,
      starts_at: r.starts_at, ends_at: r.ends_at, sort: r.sort, image: image(r),
    }));
}

export function mediaById(id) {
  const r = one('SELECT * FROM media WHERE id=?', id);
  return r ? mediaObject(r) : null;
}

export function publicSite() {
  const s = allSettings();
  const hero = s.hero ? { ...s.hero, image: s.hero.image_id ? mediaById(s.hero.image_id) : null } : null;
  const gallery = ((s.gallery && s.gallery.image_ids) || []).map(mediaById).filter(Boolean);
  return {
    business: s.business || {}, hero, values: s.values || [], gallery, social: s.social || {},
    hours: s.hours || [], announcement: s.announcement || { active: false },
    orders: s.orders || { enabled: false }, seo: s.seo || {},
    screen: { auto_scroll: s.screen?.auto_scroll === true },
    promotions: listPromotions({ onlyLive: true }),
  };
}

export function audit(user, action, entity, entityId, names = {}, detail = {}) {
  run(
    'INSERT INTO audit(user_email,action,entity,entity_id,name_ar,name_en,detail) VALUES(?,?,?,?,?,?,?)',
    user ? user.email : '', action, entity, entityId ?? null, names.name_ar || '', names.name_en || '', JSON.stringify(detail)
  );
  run('DELETE FROM audit WHERE id NOT IN (SELECT id FROM audit ORDER BY id DESC LIMIT 500)');
}
