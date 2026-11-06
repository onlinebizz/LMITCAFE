import { api } from './api.js';
import { t, tn, errorText } from './i18n.js';
import { h, ic, pageHead, btn, toast, field, selectField, emptyState, openDialog } from './ui.js';
import { kb } from './format.js';
import { imgEl, altOf, purposeOptions, chooseFiles, uploadDialog, deleteMediaFlow } from './media-ui.js';

function detail(m, done) {
  const alt_ar = field({ label: t('alt_ar'), name: 'alt_ar', dir: 'rtl', max: 200, value: m.alt_ar });
  const alt_en = field({ label: t('alt_en'), name: 'alt_en', dir: 'ltr', max: 200, value: m.alt_en });
  const purpose = selectField({ label: t('photo_purpose'), name: 'purpose', options: purposeOptions(), value: m.purpose });
  const msg = h('p', { class: 'form-msg', role: 'alert', hidden: true });
  let dirty = false;
  const save = h('button', { type: 'button', class: 'btn btn-primary' }, t('save_changes'));
  const del = btn([ic('trash'), t('delete_photo')], 'btn-danger-quiet', async () => {
    try { if (await deleteMediaFlow(m)) { d.close(true); done(); } } catch (e) { toast(errorText(e), 'error'); }
  });
  const d = openDialog({
    title: t('photo_details'), wide: true,
    body: h('div', { class: 'ph-detail' },
      h('div', { class: 'ph-big' }, imgEl(m, { sizes: '(min-width: 800px) 420px, 90vw', w: 800, alt: altOf(m) })),
      h('div', { class: 'ph-form' }, h('p', { class: 'dim' }, `${m.w && m.h ? `${m.w} × ${m.h}` : ''} ${kb(m.bytes)}`), purpose.el, alt_ar.el, alt_en.el, msg)),
    footer: [del, btn(t('cancel'), '', () => d.requestClose()), save], guard: () => dirty,
  });
  d.el.addEventListener('input', () => { dirty = true; });
  purpose.input.addEventListener('change', () => { dirty = true; });
  save.addEventListener('click', async () => {
    save.disabled = true; msg.hidden = true;
    try { await api.put(`/api/admin/media/${m.id}`, { alt_ar: alt_ar.input.value, alt_en: alt_en.input.value, purpose: purpose.input.value }); dirty = false; toast(t('changes_saved')); d.close(true); done(); } catch (e) { save.disabled = false; msg.hidden = false; msg.textContent = errorText(e); }
  });
}

export default {
  titleKey: 'nav_photos',
  async mount(root, route) {
    let all = [];
    let purpose = '';
    const grid = h('div', { class: 'photo-grid' });
    const live = h('p', { class: 'hint count-line', role: 'status' });
    const filter = selectField({ label: '', name: 'pf', options: [{ value: '', label: t('all_photos') }, ...purposeOptions()], value: '', onChange: (v) => { purpose = v; draw(); } });
    filter.input.setAttribute('aria-label', t('filter_purpose'));
    async function add(files) {
      files = files || await chooseFiles();
      if (!files.length) return;
      const made = await uploadDialog(files, { purpose: purpose || 'general' });
      if (made.length) { toast(tn('photos_added', made.length)); await refresh(); }
    }
    const addBtn = btn([ic('upload'), t('add_photos')], 'btn-primary', () => add());
    root.append(pageHead(t('nav_photos'), addBtn), h('p', { class: 'page-sub' }, t('photos_sub')), h('div', { class: 'filters' }, filter.el), live, grid);
    root.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
    root.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); add([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))); } });
    function draw() {
      const rows = all.filter((m) => !purpose || m.purpose === purpose);
      live.textContent = purpose ? tn('n_photos', rows.length) : '';
      if (!all.length) { grid.replaceChildren(emptyState({ title: t('no_photos_title'), text: t('no_photos_text'), action: btn([ic('upload'), t('add_photos')], 'btn-primary', () => add()) })); return; }
      if (!rows.length) { grid.replaceChildren(h('p', { class: 'dim' }, t('no_photos_filter'))); return; }
      grid.replaceChildren(...rows.map((m) => h('button', { type: 'button', class: 'ph', 'aria-label': `${t('photo_details')}: ${altOf(m) || `${t('photo')} ${m.id}`}`, on: { click: () => detail(m, refresh) } },
        imgEl(m, { sizes: '(min-width: 800px) 200px, 45vw', w: 400 }), h('span', { class: 'pick-tag' }, t(`purpose_${m.purpose}`)))));
    }
    async function refresh() { all = (await api.get('/api/admin/media')).media; draw(); }
    await refresh();
    if (route.query.get('add') === '1') addBtn.focus();
    return { refresh };
  },
};
