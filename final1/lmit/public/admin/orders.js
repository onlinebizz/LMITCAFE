import { api } from './api.js';
import { t, tn, lang, errorText } from './i18n.js';
import { h, pageHead, toast, emptyState } from './ui.js';
import { moneyUnit, when, num, pickName } from './format.js';

const STATUSES = ['new', 'preparing', 'ready', 'done', 'cancelled'];
const OPEN = ['new', 'preparing', 'ready'];

export default {
  titleKey: 'nav_orders',
  async mount(root, route, ctx) {
    let orders = [];
    let tab = 'open';
    const list = h('div', { class: 'olist' });
    const tabs = h('div', { class: 'seg', role: 'group', 'aria-label': t('nav_orders') });
    root.append(pageHead(t('nav_orders')), h('p', { class: 'page-sub' }, t('orders_sub')), tabs, list);

    const inTab = (o) => (tab === 'open' ? OPEN.includes(o.status) : tab === 'done' ? o.status === 'done' : o.status === 'cancelled');
    function drawTabs() {
      tabs.replaceChildren(...['open', 'done', 'cancelled'].map((k) => {
        const n = orders.filter((o) => (k === 'open' ? OPEN.includes(o.status) : o.status === k)).length;
        const b = h('button', { type: 'button', class: 'seg-b', 'aria-pressed': tab === k ? 'true' : 'false' }, t(`tab_${k}`), ' ', h('span', { class: 'seg-n' }, num(n)));
        b.addEventListener('click', () => { tab = k; drawTabs(); draw(); });
        return b;
      }));
    }
    function card(o) {
      const lines = o.items.map((i) => {
        const nm = pickName(i);
        const opt = [lang() === 'ar' ? i.variant_ar || i.variant_en : i.variant_en || i.variant_ar, lang() === 'ar' ? i.extras_ar || i.extras_en : i.extras_en || i.extras_ar].filter(Boolean).join(' + ');
        return h('li', { class: 'oline' }, h('span', { class: 'oq' }, `${num(i.qty)}×`), h('span', { class: 'on', dir: 'auto' }, nm, opt ? h('small', { dir: 'auto' }, opt) : null), h('span', { class: 'led-dots', 'aria-hidden': 'true' }), h('b', moneyUnit(i.unit_price * i.qty)));
      });
      const steps = STATUSES.map((s) => {
        const b = h('button', { type: 'button', class: `ost ${o.status === s ? 'is-cur' : ''}`, 'aria-pressed': o.status === s ? 'true' : 'false', 'data-s': s }, t(`st_${s}`));
        b.addEventListener('click', async () => {
          if (o.status === s) return;
          try { await api.put(`/api/admin/orders/${o.id}`, { status: s }); o.status = s; toast(t('order_status_saved', { n: o.number, status: t(`st_${s}`) })); drawTabs(); draw(); ctx.refreshBadge(); } catch (e) { toast(errorText(e), 'error'); }
        });
        return b;
      });
      return h('article', { class: `ocard st-${o.status}`, 'aria-label': `${t('order_no')} ${o.number}` },
        h('header', { class: 'ohead' }, h('b', { class: 'onum' }, `#${num(o.number)}`), h('time', { class: 'dim' }, when(o.created_at)), h('span', { class: 'ostat' }, t(`st_${o.status}`))),
        h('p', { class: 'ocust', dir: 'auto' }, h('b', o.name), o.phone ? h('a', { href: `tel:${o.phone.replace(/[^\d+]/g, '')}`, dir: 'ltr' }, o.phone) : null),
        o.note ? h('p', { class: 'onote', dir: 'auto' }, o.note) : null,
        h('ul', { class: 'olines' }, lines),
        h('p', { class: 'ototal' }, h('span', t('total')), h('b', moneyUnit(o.total))),
        h('div', { class: 'osteps', role: 'group', 'aria-label': t('order_status') }, steps));
    }
    function draw() {
      const rows = orders.filter(inTab);
      if (!rows.length) { list.replaceChildren(emptyState({ title: t(`no_orders_${tab}_title`), text: t(`no_orders_${tab}_text`) })); return; }
      list.replaceChildren(...rows.map(card));
    }
    async function refresh() { orders = (await api.get('/api/admin/orders')).orders; drawTabs(); draw(); }
    await refresh();
    return { refresh };
  },
};
