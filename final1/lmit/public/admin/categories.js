import { api } from './api.js';
import { t, tn, errorText } from './i18n.js';
import { h, ic, pageHead, field, toggle, btn, toast, announce, emptyState, sortable, openDialog, confirmDialog, swatch, clamp } from './ui.js';
import { pickName, otherName } from './format.js';
import { imageField, imgEl } from './media-ui.js';

const ACCENTS = ['brass', 'sage', 'terracotta', 'teal', 'olive'];

function editDialog(cat) {
  return new Promise((resolve) => {
    let dirty = false;
    const mark = () => { dirty = true; };
    const nameAr = field({ label: t('f_name_ar'), name: 'name_ar', dir: 'rtl', max: 80, required: true, value: cat ? cat.name_ar : '' });
    const nameEn = field({ label: t('f_name_en'), name: 'name_en', dir: 'ltr', max: 80, value: cat ? cat.name_en : '' });
    const descAr = field({ label: t('f_desc_ar'), name: 'desc_ar', dir: 'rtl', rows: 2, max: 200, value: cat ? cat.desc_ar : '' });
    const descEn = field({ label: t('f_desc_en'), name: 'desc_en', dir: 'ltr', rows: 2, max: 200, value: cat ? cat.desc_en : '' });
    const byName = { name_ar: nameAr, name_en: nameEn, desc_ar: descAr, desc_en: descEn };
    let accent = cat ? cat.accent : 'brass';
    let active = cat ? cat.active : true;
    const photo = imageField({ media: cat ? cat.image : null, purpose: 'category', label: t('photo'), onChange: mark });
    const picks = ACCENTS.map((a) => {
      const b = h('button', { type: 'button', class: 'acc', role: 'radio', 'aria-checked': a === accent ? 'true' : 'false', 'data-accent': a, 'aria-label': t(`accent_${a}`) }, swatch(a), h('span', t(`accent_${a}`)));
      b.addEventListener('click', () => { accent = a; mark(); picks.forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); });
      return b;
    });
    const msg = h('p', { class: 'form-msg', role: 'alert', hidden: true });
    const sw = toggle({ checked: active, label: t('cat_visible'), showLabel: true, onChange: (v) => { active = v; mark(); } });
    const form = h('form', { class: 'dlg-form', novalidate: true },
      h('div', { class: 'two' }, nameAr.el, nameEn.el), h('div', { class: 'two' }, descAr.el, descEn.el),
      h('div', { class: 'fld' }, h('p', { class: 'lbl' }, t('cat_color')), h('p', { class: 'hint' }, t('cat_color_hint')), h('div', { class: 'accs', role: 'radiogroup', 'aria-label': t('cat_color') }, picks)),
      photo.el, sw, msg);
    form.addEventListener('input', mark);
    const save = h('button', { type: 'submit', class: 'btn btn-primary', form: 'cat-form' }, t('save_changes'));
    form.id = 'cat-form';
    const d = openDialog({ title: cat ? t('edit_category') : t('add_category'), wide: true, body: form, footer: [btn(t('cancel'), '', () => d.requestClose()), save], guard: () => dirty });
    d.done.then((r) => resolve(!!r));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.hidden = true;
      Object.values(byName).forEach((f) => f.setError(''));
      if (!nameAr.input.value.trim()) { nameAr.setError(t('err_required', { field: t('f_name_ar') })); nameAr.input.focus(); return; }
      const body = { name_ar: nameAr.input.value, name_en: nameEn.input.value, desc_ar: descAr.input.value, desc_en: descEn.input.value, accent, active, image_id: photo.media ? photo.media.id : null };
      save.disabled = true;
      try {
        if (cat) await api.put(`/api/admin/categories/${cat.id}`, body); else await api.post('/api/admin/categories', body);
        toast(cat ? t('changes_saved') : t('category_added'));
        dirty = false;
        d.close(true);
      } catch (err) {
        save.disabled = false;
        const f = byName[err.field];
        if (f) { f.setError(errorText(err)); f.input.focus(); } else { msg.hidden = false; msg.textContent = errorText(err); }
      }
    });
    nameAr.input.focus();
  });
}

async function deleteFlow(c) {
  const name = pickName(c);
  const ok = await confirmDialog({ title: t('delete_category_title', { name }), body: t('delete_category_body'), confirm: t('delete_category'), danger: true });
  if (!ok) return false;
  try { await api.del(`/api/admin/categories/${c.id}`); } catch (e) {
    if (e.code !== 'category_not_empty') throw e;
    const n = Number(e.extra.count) || c.product_count || 0;
    const go = await confirmDialog({ title: t('delete_category_title', { name }), body: tn('category_has_items', n), confirm: tn('delete_category_and_items', n), danger: true });
    if (!go) return false;
    await api.del(`/api/admin/categories/${c.id}?force=1`);
  }
  toast(t('category_deleted'));
  return true;
}

export default {
  titleKey: 'nav_categories',
  async mount(root) {
    let cats = [];
    const list = h('ul', { class: 'crows' });
    root.append(pageHead(t('nav_categories'), btn([ic('plus'), t('add_category')], 'btn-primary', async () => { if (await editDialog(null)) await refresh(); })), h('p', { class: 'page-sub' }, t('categories_sub')), list);

    async function commitOrder(ids) {
      const before = cats.slice();
      cats = ids.map((id) => cats.find((c) => c.id === id));
      draw();
      try { const r = await api.post('/api/admin/categories/reorder', { ids }); cats = r.categories; toast(t('order_saved')); } catch (e) { cats = before; toast(errorText(e), 'error'); }
      draw();
    }
    async function move(i, d) {
      const j = i + d;
      if (j < 0 || j >= cats.length) return;
      const ids = clamp(cats.map((c) => c.id), i, j);
      announce(t(d < 0 ? 'moved_up' : 'moved_down', { name: pickName(cats[i]) }));
      const id = cats[i].id;
      await commitOrder(ids);
      const row = list.querySelector(`[data-id="${id}"]`);
      (row.querySelector(`[data-act="${d < 0 ? 'up' : 'down'}"]:not(:disabled)`) || row.querySelector('[data-act="edit"]'))?.focus();
    }
    function draw() {
      if (!cats.length) { list.replaceChildren(emptyState({ title: t('no_categories_title'), text: t('no_categories_text') })); return; }
      list.replaceChildren(...cats.map((c, i) => {
        const nm = pickName(c);
        const sec = otherName(c);
        return h('li', { class: `crow ${c.active ? '' : 'is-off'}`, 'data-id': c.id, 'data-accent': c.accent },
          h('div', { class: 'p-thumb' }, c.image ? imgEl(c.image, { sizes: '56px', w: 100, alt: '' }) : ic('tag')),
          h('div', { class: 'p-names' }, h('b', { class: 'p-n1', dir: 'auto' }, nm), sec ? h('span', { class: 'p-n2', dir: 'auto' }, sec) : null, h('span', { class: 'p-n2' }, tn('n_items', c.product_count))),
          h('div', { class: 'c-vis' }, toggle({ checked: c.active, label: t('cat_visible'), showLabel: true, onChange: async (v) => { try { await api.put(`/api/admin/categories/${c.id}`, { active: v }); c.active = v; toast(t(v ? 'cat_shown' : 'cat_hidden', { name: nm })); draw(); } catch (e) { toast(errorText(e), 'error'); throw e; } } })),
          h('div', { class: 'p-ops' },
            h('button', { type: 'button', class: 'icon-btn', 'data-act': 'edit', 'aria-label': `${t('edit_category')}: ${nm}`, title: t('edit_category'), on: { click: async () => { if (await editDialog(c)) await refresh(); } } }, ic('edit')),
            h('button', { type: 'button', class: 'icon-btn', 'data-act': 'up', disabled: i === 0, 'aria-label': `${t('move_up')}: ${nm}`, title: t('move_up'), on: { click: () => move(i, -1) } }, ic('up')),
            h('button', { type: 'button', class: 'icon-btn', 'data-act': 'down', disabled: i === cats.length - 1, 'aria-label': `${t('move_down')}: ${nm}`, title: t('move_down'), on: { click: () => move(i, 1) } }, ic('down')),
            h('button', { type: 'button', class: 'icon-btn icon-danger', 'aria-label': `${t('delete_category')}: ${nm}`, title: t('delete_category'), on: { click: async () => { try { if (await deleteFlow(c)) await refresh(); } catch (e) { toast(errorText(e), 'error'); } } } }, ic('trash')),
            h('span', { class: 'grip', 'aria-hidden': 'true', title: t('drag_to_move') }, ic('grip'))));
      }));
    }
    sortable(list, { item: '.crow', handle: '.grip', onDrop: commitOrder });
    async function refresh() { cats = (await api.get('/api/admin/categories')).categories; draw(); }
    await refresh();
    return { refresh };
  },
};
