// Menu page behaviour: search, category rail, product sheet, cart, counter slip, order submission, live updates.
import { t, names, fmt, ICON, renderMenuSections, renderRail } from '/js/view.js';
import { start } from '/js/shell.js';

const lang = document.documentElement.lang;
const boot = JSON.parse(document.getElementById('boot').textContent);
let cats = boot.categories;
let ordersCfg = boot.orders || { enabled: false };
const root = document.getElementById('menu-root');
const rail = document.getElementById('rail');
const search = document.getElementById('q');
const none = document.getElementById('no-results');
const money = (n) => `${fmt(n)} ${t(lang, 'sar')}`;

function el(tag, attrs, ...kids) {
  if (attrs === null || typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs)) {
    kids.unshift(attrs);
    attrs = {};
  }
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  const add = (c) => { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) c.forEach(add); else e.append(c instanceof Node ? c : document.createTextNode(String(c))); };
  kids.forEach(add);
  return e;
}
const icon = (name) => el('span', { class: 'ic', html: ICON[name], 'aria-hidden': 'true' });

// ---------- data ----------
const byId = new Map();
function index() { byId.clear(); for (const c of cats) for (const p of c.products) byId.set(p.id, { ...p, cat: c }); }
index();
const pick = (o, k = 'name') => names(o, lang, k).p;

// ---------- cart (this tab only; the menu data always comes from the server) ----------
let cart = [];
try { cart = JSON.parse(sessionStorage.getItem('lmit_cart') || '[]'); if (!Array.isArray(cart)) cart = []; } catch { cart = []; }
const save = () => { try { sessionStorage.setItem('lmit_cart', JSON.stringify(cart)); } catch { /* storage may be blocked */ } };
const keyOf = (l) => `${l.pid}|${l.vid || 0}|${[...(l.eids || [])].sort().join(',')}`;

function priced(l) {
  const p = byId.get(l.pid);
  if (!p) return null;
  const v = l.vid ? p.variants.find((x) => x.id === l.vid) : null;
  const ex = (l.eids || []).map((id) => p.extras.find((x) => x.id === id)).filter(Boolean);
  if (l.vid && !v) return null;
  const unit = p.price + (v ? v.price_delta : 0) + ex.reduce((s, e) => s + e.price, 0);
  const opt = [v ? pick(v) : '', ...ex.map((e) => pick(e))].filter(Boolean).join(' + ');
  return { p, v, ex, unit, opt, ok: p.available && p.cat.active !== false };
}
const live = () => cart.map((l) => ({ l, r: priced(l) })).filter((x) => x.r);
const totals = () => { let n = 0; let sum = 0; for (const { l, r } of live()) if (r.ok) { n += l.qty; sum += r.unit * l.qty; } return { n, sum }; };

const bar = el('button', { type: 'button', class: 'cartbar', hidden: true, 'aria-haspopup': 'dialog' }, el('span', { class: 'cb-count' }), el('span', { class: 'cb-label' }, t(lang, 'cart_bar')), el('b', { class: 'cb-total' }));
bar.addEventListener('click', openCart);
document.body.append(bar);
function drawBar(bump) {
  cart = cart.filter((l) => priced(l));
  const { n, sum } = totals();
  bar.hidden = cart.length === 0;
  bar.querySelector('.cb-count').textContent = String(n);
  bar.querySelector('.cb-total').textContent = money(sum);
  if (bump) { bar.classList.remove('bump'); void bar.offsetWidth; bar.classList.add('bump'); }
  save();
}
function addLine(line) {
  const k = keyOf(line);
  const ex = cart.find((l) => keyOf(l) === k);
  if (ex) ex.qty = Math.min(20, ex.qty + line.qty); else cart.push(line);
  drawBar(true);
}

// ---------- dialogs ----------
let openSheet = null;
function sheet(title, body, foot, { onClose } = {}) {
  const dlg = el('dialog', { class: 'sheet', 'aria-labelledby': 'sheet-t' });
  const close = el('button', { type: 'button', class: 'x', 'aria-label': t(lang, 'close') }, icon('close'));
  dlg.append(el('header', { class: 'sheet-head' }, el('h2', { id: 'sheet-t' }, title), close), el('div', { class: 'sheet-body' }, body));
  if (foot) dlg.append(el('footer', { class: 'sheet-foot' }, foot));
  close.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { dlg.remove(); if (openSheet === dlg) openSheet = null; if (onClose) onClose(); });
  document.body.append(dlg);
  openSheet = dlg;
  dlg.showModal();
  return dlg;
}
function stepper(initial, onChange, { min = 1, max = 20 } = {}) {
  let n = initial;
  const out = el('span', { class: 'qty-n', 'aria-live': 'polite' }, String(n));
  const dec = el('button', { type: 'button', 'aria-label': t(lang, 'qty_down') }, icon('minus'));
  const inc = el('button', { type: 'button', 'aria-label': t(lang, 'qty_up') }, icon('plus'));
  const sync = () => { out.textContent = String(n); dec.disabled = n <= min; inc.disabled = n >= max; onChange(n); };
  dec.addEventListener('click', () => { if (n > min) { n -= 1; sync(); } });
  inc.addEventListener('click', () => { if (n < max) { n += 1; sync(); } });
  dec.disabled = n <= min;
  return { el: el('div', { class: 'qty', role: 'group', 'aria-label': t(lang, 'qty') }, dec, out, inc), get n() { return n; } };
}

// ---------- product sheet ----------
function openProduct(pid) {
  const p = byId.get(pid);
  if (!p) return;
  const nm = names(p, lang);
  const desc = lang === 'ar' ? p.desc_ar || p.desc_en : p.desc_en || p.desc_ar;
  let vid = 0;
  const eids = new Set();
  let qty = 1;
  const total = el('b', { class: 'cb-total' });
  const add = el('button', { type: 'button', class: 'btn btn-brass btn-block' });
  const err = el('p', { class: 'err-line', role: 'alert', hidden: true }, t(lang, 'pick_option'));
  const calc = () => {
    const v = p.variants.find((x) => x.id === vid);
    const unit = p.price + (v ? v.price_delta : 0) + [...eids].reduce((s, id) => s + (p.extras.find((x) => x.id === id)?.price || 0), 0);
    total.textContent = money(unit * qty);
    add.replaceChildren(el('span', t(lang, 'add_to_order')), el('b', ` ${money(unit * qty)}`));
  };
  const body = [];
  if (p.image) {
    const w = p.image.widths || [];
    const src = w.length ? `/media/${p.image.key}-${w[w.length - 1]}.webp` : `/media/${p.image.key}-orig.${p.image.ext}`;
    body.push(el('div', { class: 'pd-img' }, el('img', { src, alt: '', width: p.image.w, height: p.image.h })));
  }
  body.push(el('p', { class: 'pd-price' }, money(p.price)));
  if (nm.s) body.push(el('p', { class: 'n2', lang: nm.sl, dir: nm.sl === 'ar' ? 'rtl' : 'ltr' }, nm.s));
  if (desc) body.push(el('p', { class: 'pd-desc' }, desc));
  if (!p.available) body.push(el('p', { class: 'tag tag-out' }, t(lang, 'sold_out')));
  if (p.available && p.variants.length) {
    const g = el('fieldset', { class: 'opts' }, el('legend', t(lang, 'options')));
    p.variants.forEach((v) => {
      const inp = el('input', { type: 'radio', name: 'variant', value: v.id });
      inp.addEventListener('change', () => { vid = v.id; err.hidden = true; calc(); });
      g.append(el('label', { class: 'opt' }, inp, el('span', pick(v)), el('span', { class: 'price' }, v.price_delta ? `${v.price_delta > 0 ? '+' : ''}${fmt(v.price_delta)}` : '')));
    });
    body.push(g, err);
  }
  if (p.available && p.extras.length) {
    const g = el('fieldset', { class: 'opts' }, el('legend', t(lang, 'extras')));
    p.extras.forEach((x) => {
      const inp = el('input', { type: 'checkbox', value: x.id });
      inp.addEventListener('change', () => { if (inp.checked) eids.add(x.id); else eids.delete(x.id); calc(); });
      g.append(el('label', { class: 'opt' }, inp, el('span', pick(x)), el('span', { class: 'price' }, `+${fmt(x.price)}`)));
    });
    body.push(g);
  }
  let foot = null;
  if (p.available) {
    const st = stepper(1, (n) => { qty = n; calc(); });
    body.push(el('div', { class: 'pd-row' }, el('span', { class: 'lbl' }, t(lang, 'qty')), st.el));
    add.addEventListener('click', () => {
      if (p.variants.length && !vid) { err.hidden = false; err.scrollIntoView({ block: 'center' }); return; }
      addLine({ pid, vid, eids: [...eids], qty });
      dlg.close();
    });
    foot = [add];
    calc();
  }
  const dlg = sheet(nm.p, body, foot);
}

function quickAdd(pid) {
  const p = byId.get(pid);
  if (!p || !p.available) return;
  if (p.variants.length || p.extras.length) { openProduct(pid); return; }
  addLine({ pid, vid: 0, eids: [], qty: 1 });
}

// ---------- cart, slip, order ----------
function openCart() {
  const dlg = sheet(t(lang, 'your_order'), [], null, {});
  renderCart(dlg);
}
function renderCart(dlg, errMsg = '') {
  const body = dlg.querySelector('.sheet-body');
  const old = dlg.querySelector('.sheet-foot');
  if (old) old.remove();
  const rows = live();
  if (!rows.length) { body.replaceChildren(el('p', t(lang, 'order_empty'))); return; }
  const list = el('ul', { class: 'cart-lines' });
  rows.forEach(({ l, r }) => {
    const st = stepper(l.qty, (n) => { l.qty = n; drawBar(); renderCart(dlg); }, { min: 1, max: 20 });
    list.append(el('li', { class: `cl ${r.ok ? '' : 'is-gone'}` },
      el('span', { class: 'cl-name' }, pick(r.p), r.opt ? el('small', { class: 'cl-opt' }, r.opt) : null, r.ok ? null : el('small', { class: 'cl-opt err-line' }, t(lang, 'unavailable_in_cart'))),
      el('span', { class: 'price cl-price' }, r.ok ? money(r.unit * l.qty) : ''),
      el('div', { class: 'cl-ops' }, r.ok ? st.el : el('span'), el('button', { type: 'button', class: 'cl-x', 'aria-label': `${t(lang, 'remove')}: ${pick(r.p)}`, on: { click: () => { cart = cart.filter((x) => x !== l); drawBar(); renderCart(dlg); } } }, t(lang, 'remove')))));
  });
  const { sum } = totals();
  const kids = [list, el('p', { class: 'cart-total' }, el('span', t(lang, 'total')), el('span', money(sum)))];
  const note = lang === 'ar' ? ordersCfg.note_ar || ordersCfg.note_en : ordersCfg.note_en || ordersCfg.note_ar;
  if (note) kids.push(el('p', { class: 'cart-note' }, note));
  const e = el('p', { class: 'err-line', role: 'alert', hidden: !errMsg }, errMsg);
  const slipBtn = el('button', { type: 'button', class: `btn ${ordersCfg.enabled ? 'btn-line' : 'btn-brass'} btn-block`, on: { click: () => renderSlip(dlg) } }, t(lang, 'show_counter'));
  const clear = el('button', { type: 'button', class: 'cl-x', on: { click: () => { cart = []; drawBar(); dlg.close(); } } }, t(lang, 'clear'));
  const foot = el('footer', { class: 'sheet-foot' });
  if (ordersCfg.enabled) {
    const name = el('input', { class: 'inp', id: 'o-name', maxlength: '60', autocomplete: 'name', required: true });
    const phone = el('input', { class: 'inp', id: 'o-phone', maxlength: '20', inputmode: 'tel', autocomplete: 'tel', dir: 'ltr' });
    const nt = el('input', { class: 'inp', id: 'o-note', maxlength: '200', placeholder: t(lang, 'note_ph') });
    const send = el('button', { type: 'button', class: 'btn btn-brass btn-block' }, t(lang, 'send_order'));
    kids.push(el('div', { class: 'fld' }, el('label', { for: 'o-name' }, t(lang, 'name')), name), el('div', { class: 'fld' }, el('label', { for: 'o-phone' }, t(lang, 'phone')), phone), el('div', { class: 'fld' }, el('label', { for: 'o-note' }, t(lang, 'note')), nt));
    send.addEventListener('click', async () => {
      e.hidden = true;
      if (!name.value.trim()) { name.setAttribute('aria-invalid', 'true'); e.hidden = false; e.textContent = t(lang, 'err_name'); name.focus(); return; }
      name.removeAttribute('aria-invalid');
      const items = live().filter((x) => x.r.ok).map(({ l }) => ({ product_id: l.pid, qty: l.qty, variant_id: l.vid || undefined, extra_ids: l.eids }));
      send.disabled = true;
      try {
        const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.value, phone: phone.value, note: nt.value, items }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const code = data.error && data.error.code;
          if (code === 'unavailable' || code === 'invalid') { await refreshMenu(); renderCart(dlg, t(lang, 'unavailable_in_cart')); return; }
          if (code === 'orders_closed') { ordersCfg = { ...ordersCfg, enabled: false }; renderCart(dlg); return; }
          throw new Error(code || 'fail');
        }
        cart = []; drawBar();
        renderDone(dlg, data.number);
      } catch (x) {
        send.disabled = false; e.hidden = false; e.textContent = x instanceof TypeError ? t(lang, 'err_offline') : t(lang, 'err_generic');
      }
    });
    foot.append(send, slipBtn, clear);
  } else foot.append(slipBtn, clear);
  kids.push(e);
  body.replaceChildren(...kids);
  dlg.append(foot);
}
function renderSlip(dlg) {
  const body = dlg.querySelector('.sheet-body');
  dlg.querySelector('.sheet-foot')?.remove();
  const rows = live().filter((x) => x.r.ok);
  const { sum } = totals();
  body.replaceChildren(el('div', { class: 'slip' }, el('p', { class: 'cart-note' }, t(lang, 'slip_title')),
    el('ul', null, rows.map(({ l, r }) => el('li', el('span', `${l.qty}× ${pick(r.p)}${r.opt ? ` (${r.opt})` : ''}`), el('b', money(r.unit * l.qty))))),
    el('p', { class: 'cart-total' }, el('span', t(lang, 'total')), el('span', money(sum)))));
  const back = el('button', { type: 'button', class: 'btn btn-line btn-block', on: { click: () => renderCart(dlg) } }, t(lang, 'back_to_order'));
  dlg.append(el('footer', { class: 'sheet-foot' }, back));
  back.focus();
}
function renderDone(dlg, number) {
  dlg.querySelector('.sheet-foot')?.remove();
  dlg.querySelector('#sheet-t').textContent = t(lang, 'order_sent');
  dlg.querySelector('.sheet-body').replaceChildren(el('div', { class: 'slip' }, el('p', { class: 'cart-note' }, t(lang, 'order_number')), el('p', { class: 'slip-no', 'aria-live': 'polite' }, String(number)), el('p', t(lang, 'order_show'))));
  const done = el('button', { type: 'button', class: 'btn btn-brass btn-block', on: { click: () => dlg.close() } }, t(lang, 'done'));
  dlg.append(el('footer', { class: 'sheet-foot' }, done));
  done.focus();
}

// ---------- search ----------
function applySearch() {
  const q = search.value.trim().toLowerCase();
  let any = false;
  root.querySelectorAll('.cat').forEach((c) => {
    let n = 0;
    c.querySelectorAll('.item').forEach((i) => { const hit = !q || i.dataset.text.includes(q); i.hidden = !hit; if (hit) n += 1; });
    c.hidden = n === 0 && !!q;
    rail.querySelector(`[data-cat="${c.dataset.cat}"]`)?.toggleAttribute('hidden', c.hidden);
    if (n) any = true;
  });
  none.hidden = any || !q;
}
search.addEventListener('input', applySearch);

// ---------- rail highlight ----------
let io;
function spy() {
  if (io) io.disconnect();
  if (!('IntersectionObserver' in window)) return;
  io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      rail.querySelectorAll('.rail-link').forEach((a) => {
        const on = a.dataset.cat === en.target.dataset.cat;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        if (on) { const r = rail.getBoundingClientRect(); const b = a.getBoundingClientRect(); if (b.left < r.left || b.right > r.right) rail.scrollTo({ left: rail.scrollLeft + (b.left - r.left) - r.width / 2 + b.width / 2, behavior: 'smooth' }); }
      });
    }
  }, { rootMargin: '-25% 0px -65% 0px' });
  root.querySelectorAll('.cat').forEach((c) => io.observe(c));
}

// ---------- events and live data ----------
root.addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]');
  if (open) { openProduct(Number(open.dataset.open)); return; }
  const add = e.target.closest('[data-add]');
  if (add && !add.disabled) quickAdd(Number(add.dataset.add));
});

function rerender() {
  index();
  root.innerHTML = renderMenuSections(cats, lang);
  rail.innerHTML = renderRail(cats, lang);
  applySearch(); spy(); drawBar();
  if (openSheet && openSheet.querySelector('.cart-lines')) renderCart(openSheet);
}
async function refreshMenu() {
  try { const r = await fetch('/api/menu', { cache: 'no-cache' }); if (r.ok) { cats = (await r.json()).categories; rerender(); } } catch { /* offline */ }
}
spy(); drawBar();
if (location.hash.startsWith('#p-')) { const n = document.querySelector(location.hash); if (n) n.scrollIntoView({ block: 'center' }); }
start((s) => { cats = s.cats; ordersCfg = (s.site && s.site.orders) || ordersCfg; rerender(); });
