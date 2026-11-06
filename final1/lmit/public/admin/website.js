import { api } from './api.js';
import { t, tn, lang, errorText } from './i18n.js';
import { S } from '/js/view.js';
import { h, ic, pageHead, field, selectField, toggle, btn, toast, setDirty, clearDirty, openDialog, confirmDialog, announce, clamp } from './ui.js';
import { pickName } from './format.js';
import { imageField, imgEl, pickImages, altOf } from './media-ui.js';

const SUBS = ['hours', 'business', 'home', 'announcement', 'search'];
const ICONS = ['friends', 'calm', 'oxygen', 'bean', 'leaf', 'cup'];
const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

// A settings form: collects values, saves through PUT /api/admin/settings, maps server field errors back onto inputs.
function settingsForm(reg, kids, collect) {
  const msg = h('p', { class: 'form-msg', role: 'alert', hidden: true });
  const save = h('button', { type: 'submit', class: 'btn btn-primary' }, t('save_changes'));
  const form = h('form', { class: 'ws-form', novalidate: true }, kids, msg, h('div', { class: 'savebar' }, save));
  form.addEventListener('input', () => setDirty('ws', true));
  form.addEventListener('change', () => setDirty('ws', true));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.hidden = true;
    Object.values(reg).forEach((f) => f.setError && f.setError(''));
    let payload;
    try { payload = collect(); } catch (err) {
      if (err.path && reg[err.path]) { reg[err.path].setError(err.message); reg[err.path].input.focus(); } else { msg.hidden = false; msg.textContent = err.message; }
      return;
    }
    save.disabled = true;
    try { await api.put('/api/admin/settings', payload); clearDirty(); toast(t('changes_saved')); } catch (err) {
      const f = err.field && reg[err.field];
      if (f) { f.setError(errorText(err)); f.input.focus(); } else { msg.hidden = false; msg.textContent = errorText(err); }
    }
    save.disabled = false;
  });
  return { form, touch: () => setDirty('ws', true) };
}
const F = (reg, path, o) => { const f = field(o); reg[path] = f; f.input.setAttribute('data-path', path); return f; };
const fail = (path, message) => Object.assign(new Error(message), { path });

// ---------- home ----------
async function home(body, s) {
  const reg = {};
  const media = (await api.get('/api/admin/media')).media;
  const byId = new Map(media.map((m) => [m.id, m]));
  const hero = s.hero || {};
  const titleAr = F(reg, 'title_ar', { label: t('hero_title_ar'), name: 'title_ar', dir: 'rtl', max: 120, value: hero.title_ar || '' });
  const titleEn = F(reg, 'title_en', { label: t('hero_title_en'), name: 'title_en', dir: 'ltr', max: 120, value: hero.title_en || '' });
  const subAr = F(reg, 'sub_ar', { label: t('hero_sub_ar'), name: 'sub_ar', dir: 'rtl', max: 160, value: hero.sub_ar || '' });
  const subEn = F(reg, 'sub_en', { label: t('hero_sub_en'), name: 'sub_en', dir: 'ltr', max: 160, value: hero.sub_en || '' });
  let touch = () => {};
  const photo = imageField({ media: hero.image_id ? byId.get(hero.image_id) || null : null, purpose: 'banner', label: t('hero_photo'), onChange: () => touch() });

  // values
  const vals = (s.values || []).map((v) => ({ ...v }));
  const vbox = h('div', { class: 'opt-list' });
  const vAdd = btn([ic('plus'), t('add_value')], '', () => { syncVals(); vals.push({ icon: 'bean', title_ar: '', title_en: '', text_ar: '', text_en: '' }); touch(); drawVals(); });
  const syncVals = () => vals.forEach((v, i) => { for (const k of ['title_ar', 'title_en', 'text_ar', 'text_en']) v[k] = vbox.querySelector(`[data-path="values.${i}.${k}"]`).value; v.icon = vbox.querySelector(`[data-path="values.${i}.icon"]`).value; });
  function drawVals() {
    for (const k of Object.keys(reg)) if (k.startsWith('values.')) delete reg[k];
    vbox.replaceChildren(...vals.map((v, i) => {
      const ico = selectField({ label: t('value_icon'), name: 'icon', options: ICONS.map((x) => ({ value: x, label: t(`icon_${x}`) })), value: v.icon });
      ico.input.setAttribute('data-path', `values.${i}.icon`);
      const ta = F(reg, `values.${i}.title_ar`, { label: t('f_title_ar'), name: 'title_ar', dir: 'rtl', max: 40, required: true, value: v.title_ar });
      const te = F(reg, `values.${i}.title_en`, { label: t('f_title_en'), name: 'title_en', dir: 'ltr', max: 40, value: v.title_en });
      const xa = F(reg, `values.${i}.text_ar`, { label: t('f_text_ar'), name: 'text_ar', dir: 'rtl', max: 160, value: v.text_ar });
      const xe = F(reg, `values.${i}.text_en`, { label: t('f_text_en'), name: 'text_en', dir: 'ltr', max: 160, value: v.text_en });
      const mv = (d) => { syncVals(); const j = i + d; if (j < 0 || j >= vals.length) return; [vals[i], vals[j]] = [vals[j], vals[i]]; touch(); drawVals(); };
      return h('div', { class: 'opt-row opt-row-v' }, ico.el, ta.el, te.el, xa.el, xe.el,
        h('div', { class: 'opt-ops' },
          h('button', { type: 'button', class: 'icon-btn', disabled: i === 0, 'aria-label': t('move_up'), on: { click: () => mv(-1) } }, ic('up')),
          h('button', { type: 'button', class: 'icon-btn', disabled: i === vals.length - 1, 'aria-label': t('move_down'), on: { click: () => mv(1) } }, ic('down')),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('remove_value'), on: { click: () => { syncVals(); vals.splice(i, 1); touch(); drawVals(); } } }, ic('trash'))));
    }));
    vAdd.disabled = vals.length >= 6;
  }
  drawVals();

  // gallery
  let gal = ((s.gallery && s.gallery.image_ids) || []).map((id) => byId.get(id)).filter(Boolean);
  const gbox = h('div', { class: 'gal-edit' });
  const gAdd = btn([ic('plus'), t('add_gallery')], '', async () => {
    const r = await pickImages({ max: 8 - gal.length, exclude: gal.map((m) => m.id), purpose: 'gallery', title: t('add_gallery') });
    if (r && r.length) { gal = gal.concat(r); touch(); drawGal(); }
  });
  function drawGal() {
    gbox.replaceChildren(...gal.map((m, i) => h('figure', { class: 'ge' }, h('div', { class: 'ge-img' }, imgEl(m, { sizes: '140px', w: 200, alt: altOf(m) })),
      h('div', { class: 'ge-ops' },
        h('button', { type: 'button', class: 'icon-btn', disabled: i === 0, 'aria-label': t('move_up'), on: { click: () => { gal = clamp(gal, i, i - 1); touch(); drawGal(); } } }, ic('up')),
        h('button', { type: 'button', class: 'icon-btn', disabled: i === gal.length - 1, 'aria-label': t('move_down'), on: { click: () => { gal = clamp(gal, i, i + 1); touch(); drawGal(); } } }, ic('down')),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('remove_photo'), on: { click: () => { gal.splice(i, 1); touch(); drawGal(); } } }, ic('trash'))))));
    if (!gal.length) gbox.append(h('p', { class: 'dim' }, t('gallery_empty')));
    gAdd.disabled = gal.length >= 8;
  }
  drawGal();

  const sf = settingsForm(reg, [
    h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_hero')), h('div', { class: 'two' }, titleAr.el, titleEn.el), h('div', { class: 'two' }, subAr.el, subEn.el), photo.el),
    h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_values')), h('p', { class: 'hint' }, t('values_hint')), vbox, vAdd),
    h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_gallery')), h('p', { class: 'hint' }, t('gallery_hint')), gbox, gAdd),
  ], () => {
    syncVals();
    vals.forEach((v, i) => { if (!v.title_ar.trim()) throw fail(`values.${i}.title_ar`, t('err_required', { field: t('f_title_ar') })); });
    return {
      hero: { title_ar: titleAr.input.value, title_en: titleEn.input.value, sub_ar: subAr.input.value, sub_en: subEn.input.value, image_id: photo.media ? photo.media.id : null },
      values: vals.map((v) => ({ icon: v.icon, title_ar: v.title_ar, title_en: v.title_en, text_ar: v.text_ar, text_en: v.text_en })),
      gallery: { image_ids: gal.map((m) => m.id) },
    };
  });
  touch = sf.touch;
  body.append(sf.form, await promotions());
}

// ---------- promotions (own endpoints) ----------
async function promotions() {
  const wrap = h('section', { class: 'pf-sec promos-sec' });
  let list = [];
  const box = h('ul', { class: 'crows' });
  const addB = btn([ic('plus'), t('add_promo')], 'btn-primary', async () => { if (await promoDialog(null)) await load(); });
  wrap.append(h('div', { class: 'sec-row' }, h('h2', { class: 'sec-title' }, t('sec_promos')), addB), h('p', { class: 'hint' }, t('promos_hint')), box);
  function draw() {
    if (!list.length) { box.replaceChildren(h('li', { class: 'rows-empty' }, t('promos_empty'))); return; }
    box.replaceChildren(...list.map((p, i) => {
      const nm = pickName(p, 'title');
      const range = [p.starts_at, p.ends_at].filter(Boolean).join(' → ');
      return h('li', { class: `crow ${p.active ? '' : 'is-off'}`, 'data-accent': 'brass' },
        h('div', { class: 'p-thumb' }, p.image ? imgEl(p.image, { sizes: '56px', w: 100, alt: '' }) : ic('tag')),
        h('div', { class: 'p-names' }, h('b', { class: 'p-n1', dir: 'auto' }, nm), range ? h('span', { class: 'p-n2', dir: 'ltr' }, range) : null),
        h('div', { class: 'c-vis' }, toggle({ checked: p.active, label: t('promo_active'), showLabel: true, onChange: async (v) => { try { await api.put(`/api/admin/promotions/${p.id}`, { active: v }); p.active = v; toast(t('changes_saved')); draw(); } catch (e) { toast(errorText(e), 'error'); throw e; } } })),
        h('div', { class: 'p-ops' },
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${t('edit_promo')}: ${nm}`, on: { click: async () => { if (await promoDialog(p)) await load(); } } }, ic('edit')),
          h('button', { type: 'button', class: 'icon-btn', disabled: i === 0, 'aria-label': `${t('move_up')}: ${nm}`, on: { click: () => reorder(i, -1) } }, ic('up')),
          h('button', { type: 'button', class: 'icon-btn', disabled: i === list.length - 1, 'aria-label': `${t('move_down')}: ${nm}`, on: { click: () => reorder(i, 1) } }, ic('down')),
          h('button', { type: 'button', class: 'icon-btn icon-danger', 'aria-label': `${t('delete_promo')}: ${nm}`, on: { click: async () => {
            const ok = await confirmDialog({ title: t('delete_promo_title', { name: nm }), body: t('delete_promo_body'), confirm: t('delete_promo'), danger: true });
            if (!ok) return;
            try { const r = await api.del(`/api/admin/promotions/${p.id}`); list = r.promotions; toast(t('promo_deleted')); draw(); } catch (e) { toast(errorText(e), 'error'); }
          } } }, ic('trash'))));
    }));
  }
  async function reorder(i, d) {
    const ids = clamp(list.map((p) => p.id), i, i + d);
    try { const r = await api.post('/api/admin/promotions/reorder', { ids }); list = r.promotions; announce(t(d < 0 ? 'moved_up' : 'moved_down', { name: pickName(list[i + d] || list[i], 'title') })); draw(); } catch (e) { toast(errorText(e), 'error'); }
  }
  async function load() { list = (await api.get('/api/admin/promotions')).promotions; draw(); }
  await load();
  return wrap;
}

function promoDialog(p) {
  return new Promise((resolve) => {
    let dirty = false;
    const mark = () => { dirty = true; };
    const f = {
      title_ar: field({ label: t('f_title_ar'), name: 'title_ar', dir: 'rtl', max: 100, required: true, value: p ? p.title_ar : '' }),
      title_en: field({ label: t('f_title_en'), name: 'title_en', dir: 'ltr', max: 100, value: p ? p.title_en : '' }),
      text_ar: field({ label: t('f_text_ar'), name: 'text_ar', dir: 'rtl', rows: 2, max: 300, value: p ? p.text_ar : '' }),
      text_en: field({ label: t('f_text_en'), name: 'text_en', dir: 'ltr', rows: 2, max: 300, value: p ? p.text_en : '' }),
      cta_ar: field({ label: t('f_cta_ar'), name: 'cta_ar', dir: 'rtl', max: 40, value: p ? p.cta_ar : '' }),
      cta_en: field({ label: t('f_cta_en'), name: 'cta_en', dir: 'ltr', max: 40, value: p ? p.cta_en : '' }),
      link_url: field({ label: t('f_link_url'), name: 'link_url', dir: 'ltr', max: 500, value: p ? p.link_url : '', hint: t('link_hint'), placeholder: '/menu' }),
      starts_at: field({ label: t('f_starts_at'), name: 'starts_at', type: 'date', dir: 'ltr', value: p ? p.starts_at : '' }),
      ends_at: field({ label: t('f_ends_at'), name: 'ends_at', type: 'date', dir: 'ltr', value: p ? p.ends_at : '', hint: t('dates_hint') }),
    };
    let active = p ? p.active : true;
    const photo = imageField({ media: p ? p.image : null, purpose: 'promo', label: t('photo'), onChange: mark });
    const msg = h('p', { class: 'form-msg', role: 'alert', hidden: true });
    const form = h('form', { class: 'dlg-form', id: 'promo-form', novalidate: true },
      h('div', { class: 'two' }, f.title_ar.el, f.title_en.el), h('div', { class: 'two' }, f.text_ar.el, f.text_en.el),
      h('div', { class: 'two' }, f.cta_ar.el, f.cta_en.el), f.link_url.el, h('div', { class: 'two' }, f.starts_at.el, f.ends_at.el), photo.el,
      toggle({ checked: active, label: t('promo_active'), showLabel: true, onChange: (v) => { active = v; mark(); } }), msg);
    form.addEventListener('input', mark);
    const save = h('button', { type: 'submit', class: 'btn btn-primary', form: 'promo-form' }, t('save_changes'));
    const d = openDialog({ title: p ? t('edit_promo') : t('add_promo'), wide: true, body: form, footer: [btn(t('cancel'), '', () => d.requestClose()), save], guard: () => dirty });
    d.done.then((r) => resolve(!!r));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.hidden = true;
      Object.values(f).forEach((x) => x.setError(''));
      if (!f.title_ar.input.value.trim()) { f.title_ar.setError(t('err_required', { field: t('f_title_ar') })); f.title_ar.input.focus(); return; }
      const body = { active, image_id: photo.media ? photo.media.id : null };
      for (const [k, x] of Object.entries(f)) body[k] = x.input.value;
      save.disabled = true;
      try {
        if (p) await api.put(`/api/admin/promotions/${p.id}`, body); else await api.post('/api/admin/promotions', body);
        toast(p ? t('changes_saved') : t('promo_added'));
        dirty = false; d.close(true);
      } catch (err) {
        save.disabled = false;
        const x = f[err.field];
        if (x) { x.setError(errorText(err)); x.input.focus(); } else { msg.hidden = false; msg.textContent = errorText(err); }
      }
    });
    f.title_ar.input.focus();
  });
}

// ---------- business ----------
function business(body, s) {
  const reg = {};
  const b = s.business || {};
  const so = s.social || {};
  const mk = (k, label, dir, extra = {}) => F(reg, k, { label, name: k, dir, max: extra.max || 200, value: (extra.src || b)[k] || '', ...extra });
  const nameAr = mk('name_ar', t('f_name_ar'), 'rtl', { required: true, max: 80 });
  const nameEn = mk('name_en', t('f_name_en'), 'ltr', { required: true, max: 80 });
  const tag = mk('tagline_en', t('f_tagline_en'), 'ltr', { max: 120, hint: t('tagline_hint') });
  const addrAr = mk('address_ar', t('f_address_ar'), 'rtl');
  const addrEn = mk('address_en', t('f_address_en'), 'ltr');
  const phone = mk('phone', t('f_phone'), 'ltr', { max: 30, inputmode: 'tel' });
  const wa = mk('whatsapp', t('f_whatsapp'), 'ltr', { max: 30, inputmode: 'tel' });
  const mail = mk('email', t('f_email'), 'ltr', { max: 120, type: 'email' });
  const maps = mk('maps_url', t('f_maps_url'), 'ltr', { max: 500, hint: t('https_hint') });
  const keys = ['tiktok', 'instagram', 'snapchat', 'x', 'facebook', 'linktree'];
  const socials = keys.map((k) => mk(k, t(`social_${k}`), 'ltr', { max: 500, src: so, placeholder: 'https://', hint: undefined }));
  const sf = settingsForm(reg, [
    h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_business')), h('div', { class: 'two' }, nameAr.el, nameEn.el), tag.el, h('div', { class: 'two' }, addrAr.el, addrEn.el), h('div', { class: 'two' }, phone.el, wa.el), h('div', { class: 'two' }, mail.el, maps.el)),
    h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_social')), h('p', { class: 'hint' }, t('social_hint')), h('div', { class: 'two' }, socials.map((x) => x.el))),
  ], () => {
    if (!nameAr.input.value.trim()) throw fail('name_ar', t('err_required', { field: t('f_name_ar') }));
    if (!nameEn.input.value.trim()) throw fail('name_en', t('err_required', { field: t('f_name_en') }));
    const social = {};
    keys.forEach((k, i) => { social[k] = socials[i].input.value; });
    return { business: { name_ar: nameAr.input.value, name_en: nameEn.input.value, tagline_en: tag.input.value, address_ar: addrAr.input.value, address_en: addrEn.input.value, phone: phone.input.value, whatsapp: wa.input.value, email: mail.input.value, maps_url: maps.input.value }, social };
  });
  body.append(sf.form);
}

// ---------- hours ----------
function hours(body, s) {
  const reg = {};
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = (s.hours || []).find((x) => x.day === i) || { day: i, closed: false, ranges: [] };
    return { day: i, closed: !!d.closed, ranges: (d.ranges || []).map((r) => ({ ...r })) };
  });
  const names = S[lang()].days;
  const box = h('div', { class: 'hrs' });
  let touch = () => {};
  const copyBtn = btn([ic('copy'), t('hours_copy', { day: names[6] })], '', () => { sync(); const src = days[6]; days.forEach((d) => { if (d.day !== 6) { d.closed = src.closed; d.ranges = src.ranges.map((r) => ({ ...r })); } }); touch(); draw(); toast(t('hours_copied')); });
  const sync = () => days.forEach((d) => d.ranges.forEach((r, j) => { r.open = box.querySelector(`[data-path="h.${d.day}.${j}.open"]`).value; r.close = box.querySelector(`[data-path="h.${d.day}.${j}.close"]`).value; }));
  function draw() {
    for (const k of Object.keys(reg)) delete reg[k];
    box.replaceChildren(...DAY_ORDER.map((i) => {
      const d = days[i];
      const rr = d.ranges.map((r, j) => {
        const o = F(reg, `h.${i}.${j}.open`, { label: t('hours_open'), name: 'open', type: 'time', dir: 'ltr', value: r.open || '' });
        const c = F(reg, `h.${i}.${j}.close`, { label: t('hours_close'), name: 'close', type: 'time', dir: 'ltr', value: r.close || '' });
        return h('div', { class: 'hr-range' }, o.el, c.el, j > 0 ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${t('hours_remove_range')}: ${names[i]}`, on: { click: () => { sync(); d.ranges.splice(j, 1); touch(); draw(); } } }, ic('trash')) : null);
      });
      return h('div', { class: `hr-row ${d.closed ? 'is-closed' : ''}` },
        h('h3', { class: 'hr-day' }, names[i]),
        toggle({ checked: d.closed, label: t('hours_closed'), showLabel: true, onChange: (v) => { sync(); d.closed = v; if (!v && !d.ranges.length) d.ranges.push({ open: '06:00', close: '02:00' }); touch(); draw(); } }),
        d.closed ? null : h('div', { class: 'hr-ranges' }, rr, d.ranges.length < 2 ? btn([ic('plus'), t('hours_add_range')], 'btn-quiet btn-sm', () => { sync(); d.ranges.push({ open: '12:00', close: '18:00' }); touch(); draw(); }, { 'aria-label': `${t('hours_add_range')}: ${names[i]}` }) : null));
    }));
  }
  draw();
  const sf = settingsForm(reg, [h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_hours')), h('p', { class: 'hint' }, t('hours_hint')), copyBtn, box)], () => {
    sync();
    const out = days.map((d) => {
      if (!d.closed && !d.ranges.length) throw fail(`h.${d.day}.0.open`, t('err_hours_range'));
      d.ranges.forEach((r, j) => { if (!r.open) throw fail(`h.${d.day}.${j}.open`, t('err_hours_time')); if (!r.close) throw fail(`h.${d.day}.${j}.close`, t('err_hours_time')); });
      return { day: d.day, closed: d.closed, ranges: d.closed ? [] : d.ranges.map((r) => ({ open: r.open, close: r.close })) };
    });
    return { hours: out };
  });
  touch = sf.touch;
  body.append(sf.form);
}

// ---------- announcement, orders, search ----------
function simple(body, s, key) {
  const reg = {};
  const v = s[key] || {};
  const state = { active: !!v.active, enabled: !!v.enabled };
  let touch = () => {};
  let kids; let collect;
  if (key === 'announcement') {
    const ta = F(reg, 'text_ar', { label: t('f_text_ar'), name: 'text_ar', dir: 'rtl', max: 160, value: v.text_ar || '' });
    const te = F(reg, 'text_en', { label: t('f_text_en'), name: 'text_en', dir: 'ltr', max: 160, value: v.text_en || '' });
    const link = F(reg, 'link_url', { label: t('f_link_url'), name: 'link_url', dir: 'ltr', max: 500, value: v.link_url || '', hint: t('link_hint') });
    kids = [h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_announcement')), h('p', { class: 'hint' }, t('announcement_hint')),
      toggle({ checked: state.active, label: t('announcement_on'), showLabel: true, onChange: (x) => { state.active = x; touch(); } }), h('div', { class: 'two' }, ta.el, te.el), link.el)];
    collect = () => ({ announcement: { active: state.active, text_ar: ta.input.value, text_en: te.input.value, link_url: link.input.value } });
  } else if (key === 'orders') {
    const na = F(reg, 'note_ar', { label: t('f_note_ar'), name: 'note_ar', dir: 'rtl', rows: 2, max: 200, value: v.note_ar || '' });
    const ne = F(reg, 'note_en', { label: t('f_note_en'), name: 'note_en', dir: 'ltr', rows: 2, max: 200, value: v.note_en || '' });
    kids = [h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_orders')), h('p', { class: 'hint' }, t('orders_hint')),
      toggle({ checked: state.enabled, label: t('orders_on'), showLabel: true, onChange: (x) => { state.enabled = x; touch(); } }), h('div', { class: 'two' }, na.el, ne.el))];
    collect = () => ({ orders: { enabled: state.enabled, note_ar: na.input.value, note_en: ne.input.value } });
  } else {
    const da = F(reg, 'desc_ar', { label: t('f_seo_ar'), name: 'desc_ar', dir: 'rtl', rows: 3, max: 200, value: v.desc_ar || '' });
    const de = F(reg, 'desc_en', { label: t('f_seo_en'), name: 'desc_en', dir: 'ltr', rows: 3, max: 200, value: v.desc_en || '' });
    kids = [h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('sec_seo')), h('p', { class: 'hint' }, t('seo_hint')), h('div', { class: 'two' }, da.el, de.el))];
    collect = () => ({ seo: { desc_ar: da.input.value, desc_en: de.input.value } });
  }
  const sf = settingsForm(reg, kids, collect);
  touch = sf.touch;
  body.append(sf.form);
}

export default {
  titleKey: 'nav_website',
  async mount(root, route) {
    const sub = SUBS.includes(route.parts[0]) ? route.parts[0] : 'home';
    const { settings } = await api.get('/api/admin/settings');
    const nav = h('nav', { class: 'subnav', 'aria-label': t('nav_website') }, SUBS.map((x) => h('a', { href: `#/website/${x}`, class: 'subnav-link', 'aria-current': x === sub ? 'page' : null }, t(`ws_${x}`))));
    const body = h('div', { class: 'ws-body' });
    root.append(pageHead(t('nav_website')), nav, body);
    if (sub === 'home') await home(body, settings);
    else if (sub === 'business') business(body, settings);
    else if (sub === 'hours') hours(body, settings);
    else simple(body, settings, sub === 'search' ? 'seo' : sub);
    return { title: t(`ws_${sub}`) };
  },
};
