import { api } from './api.js';
import { t, tn, lang, errorText } from './i18n.js';
import { h, ic, pageHead, toggle, chipToggle, swatch, toast, announce, emptyState, sortable, btn, selectField } from './ui.js';
import { money, moneyUnit, parseNum, pickName, otherName, num } from './format.js';
import { imgEl } from './media-ui.js';
import productForm from './product-form.js';

const sortItems = (a, b) => (a.sort - b.sort) || (a.id - b.id);

const list = {
  titleKey: 'nav_menu',
  async mount(root, route) {
    const st = { cats: [], items: [], q: '', cat: '', avail: route.query.get('avail') === 'on' ? 'on' : route.query.get('avail') === 'off' ? 'off' : '', editing: false, pending: false };
    const search = h('input', { type: 'search', class: 'inp search-inp', placeholder: t('search_items_ph'), 'aria-label': t('search_items'), autocomplete: 'off', enterkeyhint: 'search' });
    const catSel = selectField({ label: '', name: 'cat', options: [], value: '', onChange: (v) => { st.cat = v; draw(); } });
    catSel.input.setAttribute('aria-label', t('filter_category'));
    const availSel = selectField({ label: '', name: 'avail', options: [{ value: '', label: t('avail_all') }, { value: 'on', label: t('avail_on') }, { value: 'off', label: t('avail_off') }], value: st.avail, onChange: (v) => { st.avail = v; draw(); } });
    availSel.input.setAttribute('aria-label', t('filter_availability'));
    search.addEventListener('input', () => { st.q = search.value.trim().toLowerCase(); draw(); });
    const body = h('div', { class: 'plist' });
    const live = h('p', { class: 'hint count-line', role: 'status' });

    const addHref = () => `#/products/new${st.cat ? `?cat=${st.cat}` : ''}`;
    const addBtn = h('a', { class: 'btn btn-primary', href: addHref() }, ic('plus'), t('add_item'));
    const arrange = h('button', { type: 'button', class: 'btn btn-quiet btn-sm', 'aria-pressed': 'false', on: { click: () => {
      const active = root.classList.toggle('arranging');
      arrange.setAttribute('aria-pressed', String(active));
    } } }, ic('grip'), t('arrange_menu'));
    root.append(
      pageHead(t('nav_menu'), addBtn), h('p', { class: 'hint menu-help' }, t('menu_help')),
      h('div', { class: 'menu-destinations' },
        h('a', { class: 'menu-destination', href: lang() === 'ar' ? '/screen' : '/en/screen', target: '_blank', rel: 'noopener' }, ic('site'), t('open_screen')),
        h('a', { class: 'menu-destination', href: lang() === 'ar' ? '/menu' : '/en/menu', target: '_blank', rel: 'noopener' }, ic('external'), t('open_customer_menu'))),
      h('div', { class: 'filters' }, h('div', { class: 'search-wrap' }, ic('search'), search), catSel.el, availSel.el),
      h('details', { class: 'menu-extra-tools' }, h('summary', t('extra_settings')),
        h('a', { class: 'btn btn-quiet btn-sm', href: '#/categories' }, ic('tag'), t('nav_categories')), arrange),
      live, body);

    const match = (p) => (!st.cat || String(p.category_id) === st.cat)
      && (!st.avail || (st.avail === 'on') === p.available)
      && (!st.q || `${p.name_ar} ${p.name_en}`.toLowerCase().includes(st.q));
    const filtering = () => !!(st.q || st.avail);

    async function load() {
      const [c, p] = await Promise.all([api.get('/api/admin/categories'), api.get('/api/admin/products')]);
      st.cats = c.categories;
      st.items = p.products;
      const keep = catSel.input.value;
      catSel.input.replaceChildren(h('option', { value: '' }, t('all_categories')), ...st.cats.map((x) => h('option', { value: x.id }, pickName(x))));
      catSel.input.value = st.cats.some((x) => String(x.id) === keep) ? keep : '';
      st.cat = catSel.input.value;
    }

    // ----- ordering -----
    function visibleIds(catId) { return st.items.filter((p) => p.category_id === catId && match(p)).sort(sortItems).map((p) => p.id); }
    async function commitOrder(catId, newVisible) {
      const full = st.items.filter((p) => p.category_id === catId).sort(sortItems).map((p) => p.id);
      const vis = new Set(newVisible);
      let k = 0;
      const ids = full.map((id) => (vis.has(id) ? newVisible[k++] : id));
      const before = st.items.map((p) => ({ id: p.id, sort: p.sort }));
      ids.forEach((id, i) => { const it = st.items.find((p) => p.id === id); if (it) it.sort = i + 1; });
      draw();
      try {
        const r = await api.post('/api/admin/products/reorder', { category_id: catId, ids });
        st.items = st.items.filter((p) => p.category_id !== catId).concat(r.products);
        toast(t('order_saved'));
      } catch (e) {
        before.forEach((b) => { const it = st.items.find((p) => p.id === b.id); if (it) it.sort = b.sort; });
        draw();
        toast(errorText(e), 'error');
      }
    }
    async function move(p, dir) {
      const vis = visibleIds(p.category_id);
      const i = vis.indexOf(p.id);
      const j = i + dir;
      if (j < 0 || j >= vis.length) return;
      const next = vis.slice();
      [next[i], next[j]] = [next[j], next[i]];
      announce(t(dir < 0 ? 'moved_up' : 'moved_down', { name: pickName(p) }));
      await commitOrder(p.category_id, next);
      const li = body.querySelector(`.prow[data-id="${p.id}"]`);
      const want = li && li.querySelector(`[data-act="${dir < 0 ? 'up' : 'down'}"]:not(:disabled)`);
      (want || (li && li.querySelector('[data-act="edit"]')))?.focus();
    }

    // ----- inline price -----
    function editPrice(p, li) {
      if (li.querySelector('.price-inp')) return;
      st.editing = true;
      const cell = li.querySelector('.p-price');
      const old = cell.firstChild;
      const inp = h('input', { class: 'inp price-inp', inputmode: 'decimal', dir: 'ltr', maxlength: '8', value: String(p.price), 'aria-label': t('price_of', { name: pickName(p) }), autocomplete: 'off', enterkeyhint: 'done' });
      let busy = false;
      const stop = () => { st.editing = false; cell.replaceChildren(old); old.focus(); if (st.pending) { st.pending = false; refresh(); } };
      const save = async () => {
        if (busy) return;
        const v = parseNum(inp.value);
        if (!Number.isFinite(v) || v < 0 || v > 10000) { inp.setAttribute('aria-invalid', 'true'); toast(t('err_price'), 'error'); inp.focus(); return; }
        if (v === p.price) { stop(); return; }
        busy = true; inp.disabled = true;
        try {
          const r = await api.put(`/api/admin/products/${p.id}`, { price: v });
          Object.assign(p, r.product);
          const nl = renderRow(p);
          li.replaceWith(nl);
          st.editing = false;
          toast(t('price_saved', { name: pickName(p), price: moneyUnit(p.price) }));
          nl.querySelector('.price-btn').focus();
          if (st.pending) { st.pending = false; refresh(); }
        } catch (e) { busy = false; inp.disabled = false; toast(errorText(e), 'error'); inp.focus(); }
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } else if (e.key === 'Escape') { e.preventDefault(); stop(); } });
      inp.addEventListener('input', () => inp.removeAttribute('aria-invalid'));
      cell.replaceChildren(h('span', { class: 'price-edit' }, inp, h('span', { class: 'sar-u' }, t('sar')),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', 'aria-label': `${t('save_price')}: ${pickName(p)}`, on: { click: save } }, t('save_price')),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('cancel'), on: { click: stop } }, ic('close'))));
      inp.focus(); inp.select();
    }

    async function patch(p, body, msg) {
      try {
        const r = await api.put(`/api/admin/products/${p.id}`, body);
        Object.assign(p, r.product);
        toast(msg);
      } catch (e) { toast(errorText(e), 'error'); throw e; }
    }

    function renderRow(p) {
      const nm = pickName(p);
      const sec = otherName(p);
      const cat = st.cats.find((c) => c.id === p.category_id);
      const li = h('li', { class: `prow ${p.available ? '' : 'is-off'}`, 'data-id': p.id, 'data-accent': cat ? cat.accent : 'brass' },
        h('div', { class: 'p-thumb' }, p.image ? imgEl(p.image, { sizes: '56px', w: 100, alt: '' }) : ic('cup')),
        h('div', { class: 'p-names' }, h('b', { class: 'p-n1', dir: 'auto' }, nm), sec ? h('span', { class: 'p-n2', dir: 'auto' }, sec) : null),
        h('div', { class: 'p-price' }, h('button', { type: 'button', class: 'price-btn', 'aria-label': t('edit_price_of', { name: nm, price: moneyUnit(p.price) }), on: { click: () => editPrice(p, li) } }, h('b', money(p.price)), ' ', h('i', t('sar')), ic('edit'))),
        h('div', { class: 'p-flags' },
          toggle({ checked: p.available, label: t('available'), showLabel: true, cls: 'sw-avail', onChange: (v) => { li.classList.toggle('is-off', !v); return patch(p, { available: v }, t(v ? 'marked_available' : 'marked_unavailable', { name: nm })).catch((e) => { li.classList.toggle('is-off', v); throw e; }); } }),
          ),
        h('div', { class: 'p-ops' },
          h('a', { class: 'icon-btn', href: `#/products/${p.id}`, 'data-act': 'edit', 'aria-label': `${t('edit_item')}: ${nm}`, title: t('edit_item') }, ic('edit')),
          h('button', { type: 'button', class: 'icon-btn', 'data-act': 'up', 'aria-label': `${t('move_up')}: ${nm}`, title: t('move_up'), on: { click: () => move(p, -1) } }, ic('up')),
          h('button', { type: 'button', class: 'icon-btn', 'data-act': 'down', 'aria-label': `${t('move_down')}: ${nm}`, title: t('move_down'), on: { click: () => move(p, 1) } }, ic('down')),
          h('span', { class: 'grip', 'aria-hidden': 'true', title: t('drag_to_move') }, ic('grip'))));
      return li;
    }

    function draw() {
      addBtn.setAttribute('href', addHref());
      const cats = st.cats.filter((c) => !st.cat || String(c.id) === st.cat);
      const groups = [];
      for (const c of cats) {
        const rows = st.items.filter((p) => p.category_id === c.id && match(p)).sort(sortItems);
        if (rows.length || (!filtering() && !st.q)) groups.push({ c, rows });
      }
      const shown = groups.reduce((n, g) => n + g.rows.length, 0);
      live.textContent = filtering() || st.cat ? tn('n_items_shown', shown) : '';
      if (!st.items.length) { body.replaceChildren(emptyState({ title: t('no_items_title'), text: t('no_items_text'), action: h('a', { class: 'btn btn-primary', href: '#/products/new' }, ic('plus'), t('add_item')) })); return; }
      if (!shown && (filtering() || st.cat)) {
        body.replaceChildren(emptyState({ title: t('no_match_title'), text: t('no_match_text'), action: btn(t('clear_filters'), 'btn-primary', () => { search.value = ''; st.q = ''; st.avail = ''; availSel.input.value = ''; st.cat = ''; catSel.input.value = ''; draw(); }) }));
        return;
      }
      body.replaceChildren(...groups.map(({ c, rows }) => {
        const ul = h('ul', { class: 'rows' }, rows.map(renderRow));
        if (!rows.length) ul.append(h('li', { class: 'rows-empty' }, t('cat_empty_hint'), ' ', h('a', { href: `#/products/new?cat=${c.id}` }, t('add_item'))));
        sortable(ul, { item: '.prow', handle: '.grip', onDrop: (ids) => commitOrder(c.id, ids) });
        const nm = pickName(c);
        return h('section', { class: 'grp', 'data-accent': c.accent, 'aria-labelledby': `g${c.id}` },
          h('header', { class: 'grp-head' }, swatch(c.accent), h('h2', { class: 'grp-title', id: `g${c.id}`, dir: 'auto' }, nm), c.active ? null : h('span', { class: 'tag-off' }, t('hidden_cat')),
            h('span', { class: 'led-dots', 'aria-hidden': 'true' }), h('span', { class: 'grp-count' }, tn('n_items', rows.length)),
            h('a', { class: 'btn btn-quiet btn-sm', href: `#/products/new?cat=${c.id}`, 'aria-label': `${t('add_item')}: ${nm}` }, ic('plus'), t('add_item'))),
          ul);
      }));
    }

    async function refresh() {
      if (st.editing) { st.pending = true; return; }
      await load(); draw();
    }
    await load();
    draw();
    if (route.query.get('focus') === 'search') search.focus();
    return { refresh };
  },
};

export default {
  titleKey: 'nav_menu',
  mount(root, route, ctx) {
    const [a] = route.parts;
    if (a === 'new') return productForm.mount(root, { id: null, cat: route.query.get('cat') }, ctx);
    if (a && /^\d+$/.test(a)) return productForm.mount(root, { id: Number(a) }, ctx);
    return list.mount(root, route, ctx);
  },
};
