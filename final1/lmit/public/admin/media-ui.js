// Photo helpers: urls, browser-side downscaling, upload dialog, library picker, image field.
import { api, ApiError } from './api.js';
import { t, lang, errorText } from './i18n.js';
import { h, ic, openDialog, btn, selectField, field, toast, confirmDialog } from './ui.js';
import { kb } from './format.js';

export const PURPOSES = ['product', 'category', 'banner', 'promo', 'seasonal', 'gallery', 'general'];
export const purposeOptions = () => PURPOSES.map((p) => ({ value: p, label: t(`purpose_${p}`) }));

const base = (m, w) => (m.widths && m.widths.length ? `/media/${m.key}-${w}.webp` : `/media/${m.key}-orig.${m.ext}`);
export function imgEl(m, { sizes = '160px', w = 400, alt = '', cls = '' } = {}) {
  if (!m) return null;
  const ws = m.widths && m.widths.length ? m.widths : [];
  const src = ws.length ? base(m, ws.find((x) => x >= w) || ws[ws.length - 1]) : base(m, 0);
  const attrs = { src, alt, class: cls, loading: 'lazy', decoding: 'async' };
  if (ws.length) { attrs.srcset = ws.map((x) => `${base(m, x)} ${x}w`).join(', '); attrs.sizes = sizes; }
  if (m.w && m.h) { attrs.width = m.w; attrs.height = m.h; }
  return h('img', attrs);
}
export const altOf = (m) => (lang() === 'ar' ? m.alt_ar || m.alt_en : m.alt_en || m.alt_ar) || '';

// ---------- downscale in the browser ----------
const MB = 1048576;
const dataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});
async function bitmapOf(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* fall back */ }
  const url = await dataUrl(file);
  try {
    return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  } finally { URL.revokeObjectURL(url); }
}
export async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new ApiError('bad_image');
  let bmp;
  try { bmp = await bitmapOf(file); } catch { throw new ApiError('bad_image'); }
  const w = bmp.width || bmp.naturalWidth;
  const hh = bmp.height || bmp.naturalHeight;
  const k = Math.min(1, 2400 / Math.max(w, hh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(hh * k));
  const g = c.getContext('2d');
  g.drawImage(bmp, 0, 0, c.width, c.height);
  if (bmp.close) bmp.close();
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  if (!blob) throw new ApiError('bad_image');
  const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.png`;
  if (blob.size > 10 * MB) throw new ApiError('too_large');
  return { blob, name, w: c.width, h: c.height, preview: await dataUrl(blob), size: blob.size };
}

// ---------- rotate and crop (browser canvas, centered crop) ----------
const ASPECTS = [['crop_orig', 0], ['crop_sq', 1], ['crop_43', 4 / 3], ['crop_34', 3 / 4], ['crop_169', 16 / 9]];
async function transformImage(file, rot, aspect) {
  const bmp = await bitmapOf(file);
  const sw = bmp.width || bmp.naturalWidth;
  const sh = bmp.height || bmp.naturalHeight;
  const turn = rot % 2 !== 0;
  const rw = turn ? sh : sw;
  const rh = turn ? sw : sh;
  let cw = rw; let ch = rh;
  if (aspect) { if (rw / rh > aspect) cw = Math.round(rh * aspect); else ch = Math.round(rw / aspect); }
  const k = Math.min(1, 2400 / Math.max(cw, ch));
  const c = document.createElement('canvas');
  c.width = Math.round(cw * k); c.height = Math.round(ch * k);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2);
  g.rotate((rot * Math.PI) / 2);
  g.scale(k, k);
  g.drawImage(bmp, -sw / 2, -sh / 2);
  if (bmp.close) bmp.close();
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  if (!blob) throw new ApiError('bad_image');
  if (blob.size > 10 * MB) throw new ApiError('too_large');
  return { blob, name: `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.png`, w: c.width, h: c.height, preview: await dataUrl(blob), size: blob.size };
}

// ---------- upload dialog: preview, purpose and alt text before saving ----------
export function uploadDialog(files, { purpose = 'general' } = {}) {
  const saved = [];
  const items = [];
  const list = h('div', { class: 'up-list' });
  const saveBtn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, t('save_photos'));
  const status = h('p', { class: 'hint up-status', role: 'status' });

  const addItem = (file) => {
    const it = { file, ready: false, failed: false };
    const thumb = h('div', { class: 'up-thumb' }, h('span', { class: 'up-wait' }, t('preparing')));
    const err = h('p', { class: 'err', hidden: true, role: 'alert' });
    it.purposeSel = selectField({ label: t('photo_purpose'), name: 'purpose', options: purposeOptions(), value: purpose });
    it.alt_ar = field({ label: t('alt_ar'), name: 'alt_ar', dir: 'rtl', max: 200 });
    it.alt_en = field({ label: t('alt_en'), name: 'alt_en', dir: 'ltr', max: 200 });
    it.err = err;
    it.rot = 0; it.aspect = 0;
    const redo = async () => {
      if (!it.ready) return;
      try {
        const p = (it.rot || it.aspect) ? await transformImage(file, it.rot, it.aspect) : await prepareImage(file);
        it.prep = p; thumb.replaceChildren(h('img', { src: p.preview, alt: '' }));
      } catch (e) { err.hidden = false; err.textContent = errorText(e); }
    };
    const cropSel = selectField({ label: t('crop_label'), name: 'crop', options: ASPECTS.map(([k, v]) => ({ value: String(v), label: t(k) })), value: '0' });
    cropSel.input.addEventListener('change', () => { it.aspect = Number(cropSel.input.value); redo(); });
    const tools = h('div', { class: 'photo-tools' },
      btn(t('rotate_l'), 'btn-sm', () => { it.rot = (it.rot + 3) % 4; redo(); }),
      btn(t('rotate_r'), 'btn-sm', () => { it.rot = (it.rot + 1) % 4; redo(); }),
      btn(t('reset_photo'), 'btn-quiet btn-sm', () => { it.rot = 0; it.aspect = 0; cropSel.input.value = '0'; redo(); }));
    it.el = h('div', { class: 'up-item' }, thumb,
      h('div', { class: 'up-fields' },
        h('p', { class: 'up-name' }, file.name, ' ', h('span', { class: 'dim' }, kb(file.size))),
        tools, cropSel.el, it.purposeSel.el, it.alt_ar.el, it.alt_en.el, err,
        btn(t('remove_photo_from_list'), 'btn-quiet', () => { items.splice(items.indexOf(it), 1); it.el.remove(); check(); }, { 'aria-label': `${t('remove_photo_from_list')}: ${file.name}` })));
    list.append(it.el);
    items.push(it);
    prepareImage(file).then((p) => {
      it.prep = p; it.ready = true;
      thumb.replaceChildren(h('img', { src: p.preview, alt: '' }));
      if (p.blob !== file) it.err.after(h('p', { class: 'hint' }, t('photo_resized', { size: kb(p.size) })));
      check();
    }).catch((e) => {
      it.failed = true; err.hidden = false; err.textContent = errorText(e);
      thumb.replaceChildren(ic('warn')); check();
    });
  };
  function check() {
    const ok = items.filter((i) => i.ready);
    saveBtn.disabled = !ok.length || items.some((i) => !i.ready && !i.failed);
    saveBtn.textContent = ok.length > 1 ? t('save_n_photos', { n: ok.length }) : t('save_photos_one');
  }
  files.forEach(addItem);

  const d = openDialog({
    title: t('new_photos'), wide: true,
    body: [h('p', { class: 'hint' }, t('upload_hint')), list, status],
    footer: [btn(t('cancel'), '', () => d.requestClose()), saveBtn],
    guard: () => items.some((i) => i.ready) && !saved.length,
  });
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    let n = 0;
    for (const it of [...items]) {
      if (!it.ready) continue;
      n += 1;
      status.textContent = t('uploading_n', { n, total: items.filter((i) => i.ready).length + saved.length });
      const fd = new FormData();
      fd.append('file', it.prep.blob, it.prep.name);
      fd.append('purpose', it.purposeSel.input.value);
      fd.append('alt_ar', it.alt_ar.input.value);
      fd.append('alt_en', it.alt_en.input.value);
      try {
        const r = await api.post('/api/admin/media', fd);
        saved.push(r.media);
        items.splice(items.indexOf(it), 1); it.el.remove();
      } catch (e) {
        it.err.hidden = false; it.err.textContent = errorText(e);
        it.el.scrollIntoView({ block: 'nearest' });
      }
    }
    status.textContent = '';
    if (!items.length) d.close(saved);
    else { saveBtn.disabled = false; check(); }
  });
  return d.done.then((r) => r || saved);
}

export function chooseFiles({ multiple = true } = {}) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept: 'image/*', multiple: multiple ? true : null, class: 'sr-only', tabindex: '-1' });
    inp.addEventListener('change', () => { resolve([...inp.files]); inp.remove(); });
    inp.addEventListener('cancel', () => { resolve([]); inp.remove(); });
    document.body.append(inp);
    inp.click();
  });
}

// ---------- library picker ----------
export async function pickImages({ max = 1, exclude = [], title, purpose = '' } = {}) {
  const multi = max > 1;
  let all = [];
  const picked = [];
  const grid = h('div', { class: 'pick-grid', role: 'group', 'aria-label': t('photos') });
  const filter = selectField({ label: t('filter_purpose'), name: 'pf', options: [{ value: '', label: t('all_photos') }, ...purposeOptions()], value: purpose, onChange: () => draw() });
  const useBtn = h('button', { type: 'button', class: 'btn btn-primary', disabled: true }, '');
  const state = h('p', { class: 'hint', role: 'status' });
  let dlg;
  const sync = () => {
    useBtn.disabled = !picked.length;
    useBtn.textContent = multi ? t('add_n_photos', { n: picked.length }) : t('use_photo');
    useBtn.hidden = !multi;
    state.textContent = multi ? t('picked_of', { n: picked.length, max }) : '';
  };
  const draw = () => {
    const p = filter.input.value;
    const rows = all.filter((m) => !exclude.includes(m.id) && (!p || m.purpose === p));
    grid.replaceChildren(...(rows.length ? rows.map((m) => {
      const on = picked.some((x) => x.id === m.id);
      const b = h('button', { type: 'button', class: 'pick', 'aria-pressed': on ? 'true' : 'false', 'aria-label': altOf(m) || `${t('photo')} ${m.id}` },
        imgEl(m, { sizes: '140px', w: 200 }), h('span', { class: 'pick-tag' }, t(`purpose_${m.purpose}`)), h('span', { class: 'pick-check' }, ic('check')));
      b.addEventListener('click', () => {
        if (!multi) { dlg.close([m]); return; }
        const i = picked.findIndex((x) => x.id === m.id);
        if (i >= 0) picked.splice(i, 1); else if (picked.length < max) picked.push(m);
        b.setAttribute('aria-pressed', picked.some((x) => x.id === m.id) ? 'true' : 'false'); sync();
      });
      return b;
    }) : [h('p', { class: 'dim pick-empty' }, t('no_photos_filter'))]));
  };
  const addNew = async () => {
    const files = await chooseFiles({ multiple: multi });
    if (!files.length) return;
    const made = await uploadDialog(files, { purpose: purpose || 'general' });
    if (!made.length) return;
    all = [...made, ...all];
    if (!multi) { dlg.close([made[0]]); return; }
    for (const m of made) if (picked.length < max) picked.push(m);
    draw(); sync();
  };
  dlg = openDialog({
    title: title || t('choose_photo'), wide: true, cls: 'dlg-pick',
    body: [h('div', { class: 'pick-tools' }, filter.el, btn([ic('upload'), t('upload_new_photo')], 'btn-primary', addNew)), state, grid],
    footer: [btn(t('cancel'), '', () => dlg.requestClose()), useBtn],
  });
  useBtn.addEventListener('click', () => dlg.close(picked.slice()));
  grid.append(h('p', { class: 'dim' }, t('loading')));
  try { all = (await api.get('/api/admin/media')).media; } catch (e) { grid.replaceChildren(h('p', { class: 'err', role: 'alert' }, errorText(e))); }
  draw(); sync();
  const r = await dlg.done;
  return r || null;
}

// ---------- image field: preview plus choose, replace, remove ----------
export function imageField({ media, onChange, purpose = '', label }) {
  let cur = media || null;
  const box = h('div', { class: 'imgf-box' });
  const actions = h('div', { class: 'imgf-actions' });
  const el = h('div', { class: 'imgf' }, label ? h('p', { class: 'lbl' }, label) : null, h('div', { class: 'imgf-row' }, box, actions));
  const draw = () => {
    box.replaceChildren(cur ? imgEl(cur, { sizes: '160px', w: 400, alt: altOf(cur) }) : h('span', { class: 'imgf-ph' }, ic('photo'), h('span', t('no_photo'))));
    actions.replaceChildren(...[
      btn([ic('photo'), cur ? t('replace_photo') : t('choose_photo')], '', async () => {
        const r = await pickImages({ purpose, title: cur ? t('replace_photo') : t('choose_photo') });
        if (r && r[0]) { cur = r[0]; draw(); onChange && onChange(cur); }
      }),
      cur ? btn([ic('trash'), t('remove_photo')], 'btn-quiet', () => { cur = null; draw(); onChange && onChange(null); }) : null].filter(Boolean));
  };
  draw();
  return { el, get media() { return cur; }, set(m) { cur = m; draw(); } };
}

export async function deleteMediaFlow(m) {
  const name = altOf(m) || `${t('photo')} ${m.id}`;
  const ok = await confirmDialog({ title: t('delete_photo_title', { name }), body: t('delete_photo_body'), confirm: t('delete_photo'), danger: true });
  if (!ok) return false;
  try {
    await api.del(`/api/admin/media/${m.id}`);
  } catch (e) {
    if (e.code === 'media_in_use') {
      const uses = (e.extra.used_by || []).map((u) => h('li', `${t(`use_${u.type}`)}${u.name_ar || u.name_en ? `: ${lang() === 'ar' ? u.name_ar || u.name_en : u.name_en || u.name_ar}` : ''}`));
      const go = await confirmDialog({ title: t('in_use_title'), body: t('in_use_body'), extra: h('ul', { class: 'use-list' }, uses), confirm: t('delete_photo_anyway'), danger: true });
      if (!go) return false;
      await api.del(`/api/admin/media/${m.id}?force=1`);
    } else throw e;
  }
  toast(t('photo_deleted'));
  return true;
}
