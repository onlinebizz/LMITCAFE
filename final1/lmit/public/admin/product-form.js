import { api } from './api.js';
import { t, tn, errorText } from './i18n.js';
import { h, ic, pageHead, field, selectField, toggle, btn, toast, setDirty, clearDirty, confirmDialog, errorBlock, emptyState } from './ui.js';
import { parseNum, pickName } from './format.js';
import { imageField } from './media-ui.js';

export default {
  async mount(root, { id, cat }, ctx) {
    const [{ categories }, existing] = await Promise.all([
      api.get('/api/admin/categories'),
      id ? api.get(`/api/admin/products/${id}`) : Promise.resolve(null),
    ]);
    const p = existing && existing.product;
    if (!categories.length) {
      root.append(pageHead(t('add_item')), emptyState({ title: t('need_category_title'), text: t('need_category_text'), action: h('a', { class: 'btn btn-primary', href: '#/categories' }, t('nav_categories')) }));
      return { title: t('add_item') };
    }
    const s = {
      available: p ? p.available : true, featured: p ? p.featured : false, bestseller: p ? p.bestseller : false,
      variants: p ? p.variants.map((v) => ({ ...v })) : [], extras: p ? p.extras.map((v) => ({ ...v })) : [],
    };
    const fields = {};
    const touch = () => setDirty('product', true);
    const reg = (path, f) => { fields[path] = f; f.input.setAttribute('data-path', path); return f; };

    const category = reg('category_id', selectField({ label: t('f_category_id'), name: 'category_id', options: categories.map((c) => ({ value: c.id, label: pickName(c) })), value: p ? p.category_id : (categories.find((c) => String(c.id) === String(cat)) || categories[0]).id, onChange: touch }));
    const nameAr = reg('name_ar', field({ label: t('f_name_ar'), name: 'name_ar', dir: 'rtl', max: 120, required: true, value: p ? p.name_ar : '' }));
    const nameEn = reg('name_en', field({ label: t('f_name_en'), name: 'name_en', dir: 'ltr', max: 120, value: p ? p.name_en : '' }));
    const descAr = reg('desc_ar', field({ label: t('f_desc_ar'), name: 'desc_ar', dir: 'rtl', rows: 3, max: 500, value: p ? p.desc_ar : '' }));
    const descEn = reg('desc_en', field({ label: t('f_desc_en'), name: 'desc_en', dir: 'ltr', rows: 3, max: 500, value: p ? p.desc_en : '' }));
    const price = reg('price', field({ label: `${t('f_price')} (${t('sar')})`, name: 'price', dir: 'ltr', inputmode: 'decimal', max: 8, required: true, value: p ? String(p.price) : '', hint: t('price_hint') }));
    const photo = imageField({ media: p ? p.image : null, purpose: 'product', label: t('photo'), onChange: touch });

    const optList = (kind) => {
      const box = h('div', { class: 'opt-list' });
      const isV = kind === 'variants';
      const max = isV ? 12 : 20;
      const addB = h('button', { type: 'button', class: 'btn', on: { click: () => { s[kind].push({ name_ar: '', name_en: '', [isV ? 'price_delta' : 'price']: '' }); touch(); draw(); box.querySelector('.opt-row:last-child [data-k="name_ar"]')?.focus(); } } }, ic('plus'), t(isV ? 'add_variant' : 'add_extra'));
      const sync = () => {
        s[kind].forEach((row, i) => {
          row.name_ar = box.querySelector(`[data-path="${kind}.${i}.name_ar"]`).value;
          row.name_en = box.querySelector(`[data-path="${kind}.${i}.name_en"]`).value;
          row[isV ? 'price_delta' : 'price'] = box.querySelector(`[data-path="${kind}.${i}.${isV ? 'price_delta' : 'price'}"]`).value;
        });
      };
      function draw() {
        for (const k of Object.keys(fields)) if (k.startsWith(`${kind}.`)) delete fields[k];
        box.replaceChildren(...s[kind].map((row, i) => {
          const a = reg(`${kind}.${i}.name_ar`, field({ label: t('f_name_ar'), name: 'name_ar', dir: 'rtl', max: 60, required: true, value: row.name_ar }));
          const b = reg(`${kind}.${i}.name_en`, field({ label: t('f_name_en'), name: 'name_en', dir: 'ltr', max: 60, value: row.name_en }));
          const pk = isV ? 'price_delta' : 'price';
          const c = reg(`${kind}.${i}.${pk}`, field({ label: t(isV ? 'f_price_delta' : 'f_price'), name: pk, dir: 'ltr', inputmode: 'decimal', max: 8, value: row[pk] === '' ? '' : String(row[pk]) }));
          a.input.setAttribute('data-k', 'name_ar');
          const move = (d) => { sync(); const j = i + d; if (j < 0 || j >= s[kind].length) return; [s[kind][i], s[kind][j]] = [s[kind][j], s[kind][i]]; touch(); draw(); };
          return h('div', { class: 'opt-row' }, a.el, b.el, c.el,
            h('div', { class: 'opt-ops' },
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('move_up'), disabled: i === 0, on: { click: () => move(-1) } }, ic('up')),
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('move_down'), disabled: i === s[kind].length - 1, on: { click: () => move(1) } }, ic('down')),
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': t(isV ? 'remove_variant' : 'remove_extra'), on: { click: () => { sync(); s[kind].splice(i, 1); touch(); draw(); } } }, ic('trash'))));
        }));
        addB.disabled = s[kind].length >= max;
      }
      draw();
      return { box, addB, sync, max };
    };
    const variants = optList('variants');
    const extras = optList('extras');

    const sw = (key, label) => toggle({ checked: s[key], label, showLabel: true, onChange: (v) => { s[key] = v; touch(); } });
    const msg = h('p', { class: 'form-msg', role: 'alert', hidden: true });
    const saveBtn = h('button', { type: 'submit', class: 'btn btn-primary' }, t('save_changes'));
    const delBtn = p ? btn([ic('trash'), t('delete_item')], 'btn-danger-quiet', del) : null;

    const form = h('form', { class: 'pform', novalidate: true },
      h('div', { class: 'pf-grid' },
        h('div', { class: 'pf-main' }, category.el, h('div', { class: 'two' }, nameAr.el, nameEn.el), h('div', { class: 'two' }, descAr.el, descEn.el), price.el),
        h('div', { class: 'pf-side' }, photo.el, h('div', { class: 'sw-stack' }, sw('available', t('available')), sw('featured', t('featured')), sw('bestseller', t('bestseller'))))),
      h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('variants')), h('p', { class: 'hint' }, t('variants_hint')), variants.box, variants.addB),
      h('section', { class: 'pf-sec' }, h('h2', { class: 'sec-title' }, t('extras')), h('p', { class: 'hint' }, t('extras_hint')), extras.box, extras.addB),
      msg,
      h('div', { class: 'savebar' }, saveBtn, h('a', { class: 'btn', href: '#/products' }, t('cancel')), delBtn));
    form.addEventListener('input', touch);

    const title = p ? pickName(p) : t('add_item');
    root.append(h('a', { class: 'back', href: '#/products' }, ic('arrow'), t('back_to_menu')), pageHead(title), form);

    const fail = (path, text) => { const f = fields[path]; if (f) f.setError(text); return !!f; };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.hidden = true;
      Object.values(fields).forEach((f) => f.setError(''));
      variants.sync(); extras.sync();
      let first = null;
      const bad = (path, text) => { fail(path, text); first = first || fields[path]; };
      if (!nameAr.input.value.trim()) bad('name_ar', t('err_required', { field: t('f_name_ar') }));
      const pr = parseNum(price.input.value);
      if (price.input.value.trim() === '') bad('price', t('err_required', { field: t('f_price') }));
      else if (!Number.isFinite(pr) || pr < 0 || pr > 10000) bad('price', t('err_price'));
      const body = {
        category_id: Number(category.input.value), name_ar: nameAr.input.value, name_en: nameEn.input.value,
        desc_ar: descAr.input.value, desc_en: descEn.input.value, price: pr, image_id: photo.media ? photo.media.id : null,
        available: s.available, featured: s.featured, bestseller: s.bestseller, variants: [], extras: [],
      };
      s.variants.forEach((v, i) => {
        const d = String(v.price_delta).trim() === '' ? 0 : parseNum(v.price_delta);
        if (!v.name_ar.trim()) bad(`variants.${i}.name_ar`, t('err_required', { field: t('f_name_ar') }));
        if (!Number.isFinite(d) || d < -1000 || d > 1000) bad(`variants.${i}.price_delta`, t('err_amount'));
        body.variants.push({ name_ar: v.name_ar, name_en: v.name_en, price_delta: d });
      });
      s.extras.forEach((v, i) => {
        const d = String(v.price).trim() === '' ? 0 : parseNum(v.price);
        if (!v.name_ar.trim()) bad(`extras.${i}.name_ar`, t('err_required', { field: t('f_name_ar') }));
        if (!Number.isFinite(d) || d < 0 || d > 1000) bad(`extras.${i}.price`, t('err_amount'));
        body.extras.push({ name_ar: v.name_ar, name_en: v.name_en, price: d });
      });
      if (first) { first.input.focus(); return; }
      saveBtn.disabled = true;
      try {
        if (p) await api.put(`/api/admin/products/${p.id}`, body); else await api.post('/api/admin/products', body);
        clearDirty();
        toast(p ? t('changes_saved') : t('item_added'));
        ctx.go('#/products');
      } catch (err) {
        saveBtn.disabled = false;
        if (!(err.field && fail(err.field, errorText(err)))) { msg.hidden = false; msg.textContent = errorText(err); }
        else fields[err.field].input.focus();
      }
    });

    async function del() {
      const ok = await confirmDialog({ title: t('delete_item_title', { name: title }), body: t('delete_item_body'), confirm: t('delete_item'), danger: true });
      if (!ok) return;
      try { await api.del(`/api/admin/products/${p.id}`); clearDirty(); toast(t('item_deleted')); ctx.go('#/products'); } catch (err) { toast(errorText(err), 'error'); }
    }
    (p ? null : nameAr.input).focus?.();
    return { title };
  },
};
