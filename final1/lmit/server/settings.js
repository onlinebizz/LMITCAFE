import { one } from './db.js';
import { HttpError, vStr, vBool, vUrl, vInt, bad400 } from './http.js';

const ICONS = ['friends', 'calm', 'oxygen', 'bean', 'leaf', 'cup'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const imageId = (v, field) => {
  if (v === null || v === undefined || v === '' || v === 0) return null;
  const id = vInt(v, field, { min: 1 });
  return one('SELECT id FROM media WHERE id=?', id) ? id : null;
};

export const normalizers = {
  business: (v) => ({
    name_ar: vStr(v.name_ar, 'name_ar', { max: 80, req: true }),
    name_en: vStr(v.name_en, 'name_en', { max: 80, req: true }),
    tagline_en: vStr(v.tagline_en, 'tagline_en', { max: 120 }),
    address_ar: vStr(v.address_ar, 'address_ar', { max: 200 }),
    address_en: vStr(v.address_en, 'address_en', { max: 200 }),
    phone: vStr(v.phone, 'phone', { max: 30 }),
    whatsapp: vStr(v.whatsapp, 'whatsapp', { max: 30 }),
    email: vStr(v.email, 'email', { max: 120 }),
    maps_url: vUrl(v.maps_url, 'maps_url'),
  }),
  hero: (v) => ({
    title_ar: vStr(v.title_ar, 'title_ar', { max: 120 }),
    title_en: vStr(v.title_en, 'title_en', { max: 120 }),
    sub_ar: vStr(v.sub_ar, 'sub_ar', { max: 160 }),
    sub_en: vStr(v.sub_en, 'sub_en', { max: 160 }),
    image_id: imageId(v.image_id, 'image_id'),
  }),
  values: (v) => {
    if (!Array.isArray(v)) throw bad400('values', 'invalid', 'values must be a list.');
    if (v.length > 6) throw bad400('values', 'invalid', 'Use at most 6 items.');
    return v.map((x, i) => ({
      icon: ICONS.includes(x.icon) ? x.icon : 'bean',
      title_ar: vStr(x.title_ar, `values.${i}.title_ar`, { max: 40, req: true }),
      title_en: vStr(x.title_en, `values.${i}.title_en`, { max: 40 }),
      text_ar: vStr(x.text_ar, `values.${i}.text_ar`, { max: 160 }),
      text_en: vStr(x.text_en, `values.${i}.text_en`, { max: 160 }),
    }));
  },
  gallery: (v) => {
    const ids = Array.isArray(v.image_ids) ? v.image_ids : [];
    if (ids.length > 8) throw bad400('image_ids', 'invalid', 'Use at most 8 photos.');
    return { image_ids: ids.map((x, i) => imageId(x, `image_ids.${i}`)).filter(Boolean) };
  },
  social: (v) => {
    const out = {};
    for (const k of ['tiktok', 'instagram', 'snapchat', 'x', 'facebook', 'linktree']) out[k] = vUrl(v[k], k);
    return out;
  },
  hours: (v) => {
    if (!Array.isArray(v) || v.length !== 7) throw bad400('hours', 'invalid', 'Hours need all 7 days.');
    return v.map((d, i) => {
      const ranges = Array.isArray(d.ranges) ? d.ranges.slice(0, 2) : [];
      return {
        day: i,
        closed: !!vBool(d.closed),
        ranges: ranges.map((r, j) => {
          if (!TIME.test(r.open || '') || !TIME.test(r.close || '')) throw bad400(`hours.${i}.${j}`, 'invalid', 'Use times like 06:00.');
          return { open: r.open, close: r.close };
        }),
      };
    });
  },
  announcement: (v) => ({
    active: !!vBool(v.active),
    text_ar: vStr(v.text_ar, 'text_ar', { max: 160 }),
    text_en: vStr(v.text_en, 'text_en', { max: 160 }),
    link_url: vUrl(v.link_url, 'link_url'),
  }),
  orders: (v) => ({
    enabled: false,
    note_ar: vStr(v.note_ar, 'note_ar', { max: 200 }),
    note_en: vStr(v.note_en, 'note_en', { max: 200 }),
  }),
  seo: (v) => ({
    desc_ar: vStr(v.desc_ar, 'desc_ar', { max: 200 }),
    desc_en: vStr(v.desc_en, 'desc_en', { max: 200 }),
  }),
};

export function normalizeSetting(key, value) {
  const fn = normalizers[key];
  if (!fn) throw new HttpError(400, 'unknown_setting', `Unknown setting: ${key}`, { field: key });
  if (value === null || typeof value !== 'object') throw bad400(key, 'invalid', `${key} must be an object or list.`);
  return fn(value);
}

export const DEFAULT_HOURS = [
  // 0 Sunday ... 6 Saturday. Source: the cafe's opening hours story. Owner confirms.
  { day: 0, closed: false, ranges: [{ open: '06:00', close: '02:00' }] },
  { day: 1, closed: false, ranges: [{ open: '06:00', close: '02:00' }] },
  { day: 2, closed: false, ranges: [{ open: '06:00', close: '02:00' }] },
  { day: 3, closed: false, ranges: [{ open: '06:00', close: '02:00' }] },
  { day: 4, closed: false, ranges: [{ open: '06:00', close: '03:30' }] },
  { day: 5, closed: false, ranges: [{ open: '06:00', close: '09:30' }, { open: '12:30', close: '03:30' }] },
  { day: 6, closed: false, ranges: [{ open: '06:00', close: '02:00' }] },
];
