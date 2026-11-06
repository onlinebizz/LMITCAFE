// LMIT owner dashboard: shell, hash router, session, live updates.
import { api, setCsrf, onUnauthorized } from './api.js';
import { t, tn, lang, setLang, applyLang, errorText } from './i18n.js';
import { h, ic, confirmDialog, isDirty, clearDirty, openDialog, errorBlock, skeleton } from './ui.js';
import { showLogin } from './login.js';
import overview from './overview.js';
import products from './products.js';
import categories from './categories.js';
import photos from './photos.js';
import website from './website.js';
import orders from './orders.js';
import account from './account.js';

applyLang();
const app = document.getElementById('app');
const SCREENS = { overview, products, categories, photos, website, orders, account };
const NAV = [
  { id: 'overview', icon: 'overview', key: 'nav_overview' },
  { id: 'products', icon: 'menu_items', key: 'nav_menu' },
  { id: 'categories', icon: 'tag', key: 'nav_categories' },
  { id: 'photos', icon: 'photo', key: 'nav_photos' },
  { id: 'website', icon: 'site', key: 'nav_website' },
  { id: 'account', icon: 'user', key: 'nav_account' },
];
const TABS = ['products', 'photos', 'website'];

let user = null;
let es = null;
let inst = null;
let mountToken = 0;
let newOrders = 0;
let currentHash = location.hash;
let skipGuard = false;
let main;
let route = { name: 'products', parts: [], query: new URLSearchParams() };

const siteHref = () => (lang() === 'ar' ? '/menu' : '/en/menu');
const screenHref = () => (lang() === 'ar' ? '/screen' : '/en/screen');

// ---------- routing ----------
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, q] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const name = SCREENS[parts[0]] ? parts[0] : 'products';
  return { name, parts: parts.slice(1), query: new URLSearchParams(q || '') };
}

async function render() {
  route = parseHash();
  const screen = SCREENS[route.name];
  const token = ++mountToken;
  if (inst && inst.unmount) { try { inst.unmount(); } catch { /* ignore */ } }
  inst = null;
  clearDirty();
  document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === route.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  main.replaceChildren(skeleton(6));
  main.className = `main main-${route.name}`;
  try {
    const root = h('div', { class: 'screen' });
    const i = await screen.mount(root, route, { refreshBadge, go, signOut });
    if (token !== mountToken) return;
    inst = i || {};
    main.replaceChildren(root);
    setTitle();
    const head = root.querySelector('h1');
    if (head) head.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (e) {
    if (token !== mountToken) return;
    main.replaceChildren(errorBlock(errorText(e), () => render()));
  }
}

function setTitle() {
  const name = (inst && inst.title) || t(SCREENS[route.name].titleKey);
  document.title = `${newOrders > 0 ? `(${newOrders}) ` : ''}${name} | ${t('brand')}`;
}

export const go = (hash) => { location.hash = hash; };

window.addEventListener('hashchange', async () => {
  if (skipGuard) { skipGuard = false; currentHash = location.hash; return; }
  if (!user) return;
  if (isDirty()) {
    const target = location.hash;
    skipGuard = true;
    location.hash = currentHash;
    const ok = await confirmDialog({ title: t('discard_title'), body: t('discard_body'), confirm: t('discard_confirm'), cancel: t('keep_editing') });
    if (ok) { clearDirty(); location.hash = target; }
    return;
  }
  currentHash = location.hash;
  render();
});

// ---------- orders badge and live updates ----------
function setBadge(n) {
  newOrders = n;
  document.querySelectorAll('.nav-badge').forEach((b) => {
    b.hidden = n < 1;
    b.querySelector('.nb-n').textContent = n > 99 ? '99+' : String(n);
    b.querySelector('.sr-only').textContent = tn('new_orders_label', n);
  });
  if (inst) setTitle();
}
async function refreshBadge() {
  try { const s = await api.get('/api/admin/stats'); setBadge(s.new_orders); } catch { /* shown elsewhere */ }
}

let refreshTimer;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { if (inst && inst.refresh) Promise.resolve(inst.refresh()).catch(() => {}); }, 250);
}
function startStream() {
  stopStream();
  let first = true;
  es = new EventSource('/api/stream');
  es.addEventListener('hello', () => { if (!first) { refreshBadge(); scheduleRefresh(); } first = false; });
  es.addEventListener('change', (ev) => {
    let d = {};
    try { d = JSON.parse(ev.data); } catch { /* ignore */ }
    if (d.scope === 'orders') { refreshBadge(); if (route.name === 'orders') scheduleRefresh(); }
    else { if (route.name === 'overview') refreshBadge(); scheduleRefresh(); }
  });
}
function stopStream() { if (es) { es.close(); es = null; } }

// ---------- shell ----------
function navLink(n, cls) {
  const a = h('a', { href: `#/${n.id}`, class: cls, 'data-nav': n.id }, ic(n.icon), h('span', { class: 'nl-text' }, t(n.key)));
  if (n.id === 'orders') a.append(h('span', { class: 'nav-badge', hidden: true }, h('span', { class: 'nb-n' }, '0'), h('span', { class: 'sr-only' })));
  return a;
}

async function switchLang() {
  if (isDirty()) {
    const ok = await confirmDialog({ title: t('discard_title'), body: t('discard_body'), confirm: t('discard_confirm'), cancel: t('keep_editing') });
    if (!ok) return;
  }
  setLang(lang() === 'ar' ? 'en' : 'ar');
  clearDirty();
  buildShell();
  render();
  setBadge(newOrders);
}

async function signOut() {
  if (isDirty()) {
    const ok = await confirmDialog({ title: t('discard_title'), body: t('discard_body'), confirm: t('discard_confirm'), cancel: t('keep_editing') });
    if (!ok) return;
  }
  try { await api.post('/api/admin/logout'); } catch { /* the cookie may already be gone */ }
  endSession('');
}

function openMore() {
  const item = (icon, label, onClick, href) => (href
    ? h('a', { class: 'more-item', href, target: '_blank', rel: 'noopener' }, ic(icon), h('span', label))
    : h('button', { type: 'button', class: 'more-item', on: { click: onClick } }, ic(icon), h('span', label)));
  const links = ['categories', 'account'].map((id) => {
    const n = NAV.find((x) => x.id === id);
    return h('a', { class: 'more-item', href: `#/${id}`, on: { click: () => d.close() } }, ic(n.icon), h('span', t(n.key)));
  });
  const d = openDialog({
    title: t('more'), cls: 'dlg-sheet',
    body: h('div', { class: 'more-list' }, links,
      item('site', t('open_screen'), null, screenHref()),
      item('external', t('open_customer_menu'), null, siteHref()),
      item('globe', t('lang_other'), () => { d.close(); switchLang(); }),
      item('logout', t('sign_out'), () => { d.close(); signOut(); })),
  });
}

function buildShell() {
  app.className = 'shell';
  main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
  const side = h('aside', { class: 'side' },
    h('a', { class: 'side-logo', href: '#/products', 'aria-label': t('brand') }, h('img', { src: '/brand/logo-lockup-cream.png', width: 240, height: 97, alt: t('brand') })),
    h('nav', { class: 'side-nav', 'aria-label': t('main_nav') },
      NAV.filter((n) => TABS.includes(n.id)).map((n) => navLink(n, 'side-link')),
      h('details', { class: 'admin-advanced' }, h('summary', t('extra_settings')),
        NAV.filter((n) => ['categories', 'account'].includes(n.id)).map((n) => navLink(n, 'side-link')))),
    h('div', { class: 'side-foot' },
      h('a', { class: 'side-link', href: screenHref(), target: '_blank', rel: 'noopener' }, ic('site'), h('span', { class: 'nl-text' }, t('open_screen'))),
      h('a', { class: 'side-link', href: siteHref(), target: '_blank', rel: 'noopener' }, ic('external'), h('span', { class: 'nl-text' }, t('open_customer_menu'))),
      h('button', { type: 'button', class: 'side-link', on: { click: switchLang } }, ic('globe'), h('span', { class: 'nl-text' }, t('lang_other'))),
      h('button', { type: 'button', class: 'side-link', on: { click: signOut } }, ic('logout'), h('span', { class: 'nl-text' }, t('sign_out')))));
  const top = h('header', { class: 'topbar' },
    h('img', { src: '/brand/logo-mark-cream.png', alt: '', width: 32, height: 32, class: 'topbar-mark' }),
    h('span', { class: 'topbar-name' }, t('brand')),
    h('button', { type: 'button', class: 'topbar-lang', on: { click: switchLang } }, ic('globe'), t('lang_other')));
  const tabs = h('nav', { class: 'tabs', 'aria-label': t('main_nav') },
    TABS.map((id) => navLink(NAV.find((n) => n.id === id), 'tab')),
    h('button', { type: 'button', class: 'tab', on: { click: openMore } }, ic('burger'), h('span', { class: 'nl-text' }, t('more'))));
  const skip = h('button', { type: 'button', class: 'skip', on: { click: () => main.focus() } }, t('skip'));
  app.replaceChildren(skip, side, top, main, tabs);
  document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === route.name) a.setAttribute('aria-current', 'page'); });
}

function endSession(message) {
  stopStream();
  clearDirty();
  user = null; inst = null; mountToken += 1;
  setCsrf('');
  document.querySelectorAll('dialog').forEach((d) => d.close());
  showLogin(app, { message, done: startApp });
}

function startApp(u) {
  user = u;
  app.className = 'shell';
  if (!location.hash || location.hash === '#') location.hash = '#/overview';
  currentHash = location.hash;
  buildShell();
  startStream();
  refreshBadge();
  render();
}

onUnauthorized(() => { if (user) endSession(t('err_unauthorized')); });

// ---------- boot ----------
async function boot() {
  try {
    const me = await api.get('/api/admin/me', { quiet: true });
    setCsrf(me.csrf);
    startApp(me.user);
  } catch (e) {
    if (e.code === 'unauthorized') { showLogin(app, { message: '', done: startApp }); return; }
    app.className = 'shell-boot';
    app.replaceChildren(errorBlock(errorText(e), boot));
  }
}
boot();
