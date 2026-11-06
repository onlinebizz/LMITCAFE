// Small DOM helpers: element builder, icons, toasts, dialogs, switches, sortable lists, unsaved-changes state.
import { ICON } from '/js/view.js';
import { t } from './i18n.js';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c) => {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

// ---------- icons (24px grid, 1.6 stroke, round caps, same family as the site icons) ----------
const s24 = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const OWN = {
  overview: s24('<path d="M4 11.5 12 5l8 6.500"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>'),
  menu_items: s24('<path d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10.500h1.500a2 2 0 0 1 0 4H16"/><path d="M8 4c-1 1.500 1 2 0 3.500M12 4c-1 1.500 1 2 0 3.500"/>'),
  tag: s24('<path d="M4 12V5h7l9 9-7 7z"/><circle cx="8.500" cy="9" r="1.200"/>'),
  photo: s24('<rect x="3.500" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.800"/><path d="m4 17 5-4.500 4 3.500 3-2.500 4 3.500"/>'),
  site: s24('<rect x="3.500" y="4.500" width="17" height="15" rx="2"/><path d="M3.500 9h17"/><path d="M7 6.800h.01M9.800 6.800h.01"/>'),
  orders: s24('<path d="M6 3.500h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8.500h6M9 12h6"/>'),
  user: s24('<circle cx="12" cy="8.500" r="3.500"/><path d="M5 20c0-4 3-6.500 7-6.500s7 2.500 7 6.500"/>'),
  logout: s24('<path d="M14 4.500H6a1.500 1.500 0 0 0-1.500 1.500v12A1.500 1.500 0 0 0 6 19.500h8"/><path d="M10 12h10M17 8.500 20.500 12 17 15.500"/>'),
  download: s24('<path d="M12 4v11M7.500 11 12 15.500 16.500 11"/><path d="M5 19.500h14"/>'),
  upload: s24('<path d="M12 15.500V4.500M7.500 9 12 4.500 16.500 9"/><path d="M5 19.500h14"/>'),
  external: s24('<path d="M13 5h6v6"/><path d="M19 5 11 13"/><path d="M17 14v4a1.500 1.500 0 0 1-1.500 1.500h-9A1.500 1.500 0 0 1 5 18V9a1.500 1.500 0 0 1 1.500-1.500H10"/>'),
  edit: s24('<path d="M5 19l1-4L16.500 4.500a1.800 1.800 0 0 1 2.500 0l.5.500a1.800 1.800 0 0 1 0 2.500L9 18z"/><path d="m14.500 6.500 3 3"/>'),
  trash: s24('<path d="M4.500 7h15"/><path d="M9.500 7V4.500h5V7"/><path d="M6.500 7l.8 12.500h9.400L17.500 7"/><path d="M10 11v5M14 11v5"/>'),
  up: s24('<path d="m6 14.500 6-6 6 6"/>'),
  down: s24('<path d="m6 9.500 6 6 6-6"/>'),
  grip: s24('<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="2.600"/>'),
  check: s24('<path d="m5 12.500 4.500 4.500L19 7.500"/>'),
  burger: s24('<path d="M4.500 7h15M4.500 12h15M4.500 17h15"/>'),
  star: s24('<path d="m12 4 2.300 5 5.400.6-4 3.700 1.100 5.400L12 16l-4.800 2.700L8.300 13.300l-4-3.700L9.700 9z"/>'),
  flame: s24('<path d="M12 20.500c-3.500 0-6-2.400-6-5.600 0-3 2.200-4.500 3-7 1.500 1 2.500 2.200 2.800 3.800.8-1.100 1.200-2.400 1.200-4.200 3 1.800 5 4.700 5 7.400 0 3.100-2.500 5.600-6 5.600z"/>'),
  clock: s24('<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>'),
  warn: s24('<path d="M12 4.500 21 19.500H3z"/><path d="M12 10v4.500M12 17h.01"/>'),
  camera: s24('<path d="M4 8.500h3L8.500 6h7L17 8.500h3v10H4z"/><circle cx="12" cy="13.500" r="3.200"/>'),
  copy: s24('<rect x="8.500" y="8.500" width="11" height="11" rx="1.500"/><path d="M15.500 8.500v-3A1.500 1.500 0 0 0 14 4H6.500A1.500 1.500 0 0 0 5 5.500V13A1.500 1.500 0 0 0 6.500 14.500h2"/>'),
  globe2: s24('<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c3 3.300 3 13.700 0 17M12 3.500c-3 3.300-3 13.700 0 17"/>'),
  eye: s24('<path d="M3 12s3.500-6 9-6 9 6 9 6-3.500 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.600"/>'),
  eyeoff: s24('<path d="M4 4l16 16"/><path d="M9.800 6.200A9 9 0 0 1 12 6c5.500 0 9 6 9 6a15 15 0 0 1-3 3.600M6.500 7.800A14 14 0 0 0 3 12s3.500 6 9 6c1.200 0 2.300-.3 3.300-.7"/>'),
  folder: s24('<path d="M3.500 7a1.500 1.500 0 0 1 1.500-1.500h4.500l2 2.500H19a1.500 1.500 0 0 1 1.500 1.500v8A1.500 1.500 0 0 1 19 19H5a1.500 1.500 0 0 1-1.500-1.500z"/>'),
};
export const ic = (name) => {
  const svg = OWN[name] || ICON[name] || '';
  return h('span', { class: 'ic', html: svg, 'aria-hidden': 'true' });
};
export const iconHtml = (name) => OWN[name] || ICON[name] || '';

// ---------- toasts ----------
export function toast(msg, kind = 'ok') {
  const host = document.getElementById(kind === 'error' ? 'alerts' : 'toasts');
  const el = h('div', { class: `toast toast-${kind}` }, ic(kind === 'error' ? 'warn' : 'check'), h('span', msg));
  host.append(el);
  setTimeout(() => el.classList.add('out'), kind === 'error' ? 7000 : 3200);
  setTimeout(() => el.remove(), kind === 'error' ? 7400 : 3600);
}
let sr;
export function announce(msg) {
  if (!sr) { sr = h('div', { class: 'sr-only', 'aria-live': 'polite' }); document.body.append(sr); }
  sr.textContent = '';
  setTimeout(() => { sr.textContent = msg; }, 30);
}

// ---------- unsaved changes ----------
const dirtyKeys = new Set();
export const setDirty = (key, on) => { if (on) dirtyKeys.add(key); else dirtyKeys.delete(key); };
export const isDirty = () => dirtyKeys.size > 0;
export const clearDirty = () => dirtyKeys.clear();
window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

// ---------- dialogs (native <dialog>) ----------
export function openDialog({ title, body, footer, wide = false, guard, cls = '' }) {
  const dlg = h('dialog', { class: `dlg ${wide ? 'dlg-wide' : ''} ${cls}`, 'aria-labelledby': 'dlg-title-' + (openDialog.n = (openDialog.n || 0) + 1) });
  const id = 'dlg-title-' + openDialog.n;
  let result;
  const close = (r) => { result = r; if (dlg.open) dlg.close(); };
  const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('close'), on: { click: () => requestClose() } }, ic('close'));
  const requestClose = async () => {
    if (guard && guard()) { const ok = await confirmDialog({ title: t('discard_title'), body: t('discard_body'), confirm: t('discard_confirm'), cancel: t('keep_editing') }); if (!ok) return; }
    close(undefined);
  };
  dlg.append(h('header', { class: 'dlg-head' }, h('h2', { id, class: 'dlg-title' }, title), closeBtn), h('div', { class: 'dlg-body' }, body));
  if (footer) dlg.append(h('footer', { class: 'dlg-foot' }, footer));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); requestClose(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) requestClose(); });
  const done = new Promise((resolve) => dlg.addEventListener('close', () => { dlg.remove(); resolve(result); }));
  document.body.append(dlg);
  dlg.showModal();
  return { el: dlg, close, done, requestClose };
}

export function confirmDialog({ title, body, confirm, cancel, danger = false, extra }) {
  return new Promise((resolve) => {
    let out = false;
    const no = h('button', { type: 'button', class: 'btn', autofocus: true, on: { click: () => d.close() } }, cancel || t('cancel'));
    const yes = h('button', { type: 'button', class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, on: { click: () => { out = true; d.close(); } } }, confirm);
    const d = openDialog({ title, body: [h('p', { class: 'dlg-text' }, body), extra || null], footer: [no, yes], cls: 'dlg-confirm' });
    d.done.then(() => resolve(out));
    no.focus();
  });
}

// ---------- form pieces ----------
let uid = 0;
export function field({ label, name, value = '', dir, type = 'text', max, rows, hint, required, inputmode, placeholder, autocomplete, onInput, min, step, readonly }) {
  const id = `f${++uid}`;
  const isArea = !!rows;
  const input = h(isArea ? 'textarea' : 'input', {
    id, name, type: isArea ? null : type, rows, maxlength: max, inputmode, placeholder, autocomplete, min, step, readonly,
    'data-field': name, dir: dir || null, lang: dir === 'rtl' ? 'ar' : dir === 'ltr' ? 'en' : null, required: required ? true : null,
    class: 'inp', 'aria-describedby': `${id}-e${hint ? ` ${id}-h` : ''}`,
  });
  input.value = value ?? '';
  const err = h('p', { class: 'err', id: `${id}-e`, hidden: true });
  const el = h('div', { class: 'fld' },
    h('label', { for: id, class: 'lbl' }, label, required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
    input, hint ? h('p', { class: 'hint', id: `${id}-h` }, hint) : null, err);
  input.addEventListener('input', () => { setError(''); onInput && onInput(input.value); });
  function setError(msg) { err.hidden = !msg; err.textContent = msg || ''; input.toggleAttribute('aria-invalid', !!msg); if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  return { el, input, setError, get value() { return input.value; }, set value(v) { input.value = v; } };
}

export function selectField({ label, name, options, value, onChange }) {
  const id = `f${++uid}`;
  const sel = h('select', { id, name, class: 'inp', 'data-field': name }, options.map((o) => h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label)));
  sel.value = value ?? '';
  const err = h('p', { class: 'err', id: `${id}-e`, hidden: true });
  sel.addEventListener('change', () => { setError(''); onChange && onChange(sel.value); });
  function setError(msg) { err.hidden = !msg; err.textContent = msg || ''; if (msg) sel.setAttribute('aria-invalid', 'true'); else sel.removeAttribute('aria-invalid'); }
  return { el: h('div', { class: 'fld' }, label ? h('label', { for: id, class: 'lbl' }, label) : null, sel, err), input: sel, setError };
}

// Switch: a real button with role=switch. onChange may return a promise; a rejection restores the old state.
export function toggle({ checked = false, label, showLabel = false, onChange, cls = '' }) {
  const text = h('span', { class: 'sw-text' }, label);
  const btn = h('button', { type: 'button', class: `sw ${showLabel ? 'sw-row' : ''} ${cls}`, role: 'switch', 'aria-checked': checked ? 'true' : 'false', 'aria-label': showLabel ? null : label },
    showLabel ? text : null, h('span', { class: 'sw-track', 'aria-hidden': 'true' }));
  btn.addEventListener('click', async () => {
    const next = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', next ? 'true' : 'false');
    if (!onChange) return;
    btn.disabled = true;
    try { await onChange(next); } catch { btn.setAttribute('aria-checked', next ? 'false' : 'true'); }
    btn.disabled = false;
    if (document.activeElement === document.body) btn.focus();
  });
  btn.set = (v) => btn.setAttribute('aria-checked', v ? 'true' : 'false');
  Object.defineProperty(btn, 'on', { get: () => btn.getAttribute('aria-checked') === 'true' });
  return btn;
}

export function chipToggle({ pressed, label, iconName, onChange }) {
  const b = h('button', { type: 'button', class: 'chip-t', 'aria-pressed': pressed ? 'true' : 'false' }, iconName ? ic(iconName) : null, h('span', label));
  b.addEventListener('click', async () => {
    const next = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', next ? 'true' : 'false');
    b.disabled = true;
    try { await onChange(next); } catch { b.setAttribute('aria-pressed', next ? 'false' : 'true'); }
    b.disabled = false;
    b.focus();
  });
  return b;
}

export const swatch = (accent) => h('span', { class: 'swatch', 'data-accent': accent, 'aria-hidden': 'true' });

export function skeleton(rows = 5) {
  return h('div', { class: 'skel', 'aria-busy': 'true' }, h('span', { class: 'sr-only' }, t('loading')), Array.from({ length: rows }, () => h('div', { class: 'skel-row' })));
}

export function emptyState({ title, text, action }) {
  return h('div', { class: 'empty' }, h('h2', { class: 'empty-t' }, title), text ? h('p', text) : null, action || null);
}

export function errorBlock(msg, retry) {
  return h('div', { class: 'empty empty-err', role: 'alert' }, h('h2', { class: 'empty-t' }, t('load_failed')), h('p', msg),
    retry ? h('button', { type: 'button', class: 'btn btn-primary', on: { click: retry } }, t('retry')) : null);
}

export function pageHead(title, ...actions) {
  return h('div', { class: 'page-head' }, h('h1', { class: 'page-title', tabindex: '-1' }, title), actions.length ? h('div', { class: 'page-actions' }, actions) : null);
}

export const btn = (label, cls, onClick, extra = {}) => h('button', { type: 'button', class: `btn ${cls || ''}`, on: { click: onClick }, ...extra }, label);

// ---------- sortable lists: pointer drag on a handle. Buttons elsewhere always work too. ----------
export function sortable(container, { item, handle, onDrop }) {
  container.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest(handle);
    if (!grip || !container.contains(grip) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const row = grip.closest(item);
    if (!row) return;
    e.preventDefault();
    const start = [...container.querySelectorAll(item)].map((r) => r.dataset.id).join(',');
    grip.setPointerCapture(e.pointerId);
    row.classList.add('dragging');
    const move = (ev) => {
      const y = ev.clientY;
      if (y < 70) window.scrollBy(0, -14); else if (y > window.innerHeight - 70) window.scrollBy(0, 14);
      const sibs = [...container.querySelectorAll(item)].filter((r) => r !== row);
      let placed = false;
      for (const s of sibs) {
        const r = s.getBoundingClientRect();
        if (y < r.top + r.height / 2) { if (s.previousElementSibling !== row) s.before(row); placed = true; break; }
      }
      if (!placed && sibs.length && container.lastElementChild !== row) sibs[sibs.length - 1].after(row);
    };
    const end = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      row.classList.remove('dragging');
      const ids = [...container.querySelectorAll(item)].map((r) => r.dataset.id);
      if (ids.join(',') !== start) onDrop(ids.map(Number));
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });
}

export const clamp = (a, i, j) => { const b = a.slice(); const [x] = b.splice(i, 1); b.splice(j, 0, x); return b; };
