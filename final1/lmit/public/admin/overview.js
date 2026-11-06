import { api } from './api.js';
import { t, tn, lang, errorText } from './i18n.js';
import { h, ic, pageHead, errorBlock } from './ui.js';
import { num, when, todayLong, money } from './format.js';

const SECTION_KEY = { business: 'sec_business', social: 'sec_business', hero: 'sec_home', values: 'sec_home', gallery: 'sec_home', hours: 'sec_hours', announcement: 'sec_announcement', orders: 'sec_orders', seo: 'sec_seo' };

export function describe(r) {
  const d = r.detail || {};
  const name = (lang() === 'ar' ? r.name_ar || r.name_en : r.name_en || r.name_ar) || t('ev_unnamed');
  switch (r.action) {
    case 'product.price': return t('ev_price', { name, from: money(d.price?.from ?? 0), to: money(d.price?.to ?? 0), sar: t('sar') });
    case 'product.update':
      if (d.available === true) return t('ev_avail_on', { name });
      if (d.available === false) return t('ev_avail_off', { name });
      return t('ev_product_update', { name });
    case 'product.create': return t('ev_product_create', { name });
    case 'product.delete': return t('ev_product_delete', { name });
    case 'product.reorder': return t('ev_product_reorder', { name });
    case 'category.create': return t('ev_category_create', { name });
    case 'category.update': return t('ev_category_update', { name });
    case 'category.delete': return t('ev_category_delete', { name });
    case 'category.reorder': return t('ev_category_reorder');
    case 'media.upload': return t('ev_media_upload');
    case 'media.update': return t('ev_media_update');
    case 'media.delete': return t('ev_media_delete');
    case 'promotion.create': return t('ev_promo_create', { name });
    case 'promotion.update': return t('ev_promo_update', { name });
    case 'promotion.delete': return t('ev_promo_delete', { name });
    case 'settings.update': {
      const keys = [...new Set((d.keys || []).map((k) => SECTION_KEY[k]).filter(Boolean))];
      return t('ev_settings', { what: keys.map((k) => t(k)).join(lang() === 'ar' ? '، ' : ', ') || t('sec_home') });
    }
    case 'order.status': return t('ev_order_status', { status: t(`st_${d.status}`) });
    case 'account.password': return t('ev_password');
    default: return t('ev_other');
  }
}

export default {
  titleKey: 'nav_overview',
  async mount(root) {
    const body = h('div', { class: 'ov' });
    root.append(pageHead(t('nav_overview')), h('p', { class: 'page-sub' }, todayLong()), body);

    const draw = (s) => {
      const row = (label, n, href, hot) => h(href ? 'a' : 'div', { class: `led-row ${hot ? 'led-hot' : ''}`, href }, h('span', { class: 'led-k' }, label), h('span', { class: 'led-dots', 'aria-hidden': 'true' }), h('b', { class: 'led-v' }, num(n)));
      const ledger = h('section', { class: 'ledger', 'aria-labelledby': 'ov-count' },
        h('h2', { class: 'sec-title', id: 'ov-count' }, t('ov_counts')),
        row(t('ov_items'), s.products, '#/products'),
        row(t('ov_available'), s.available, '#/products?avail=on'),
        row(t('ov_unavailable'), s.unavailable, '#/products?avail=off'),
        row(t('ov_categories'), s.categories, '#/categories'));
      const act = (icon, label, href) => h('a', { class: 'qa', href }, ic(icon), h('span', label), ic('arrow'));
      const quick = h('section', { class: 'quick', 'aria-labelledby': 'ov-quick' },
        h('h2', { class: 'sec-title', id: 'ov-quick' }, t('ov_quick')),
        act('plus', t('qa_add_item'), '#/products/new'),
        act('tag', t('qa_price'), '#/products?focus=search'),
        act('photo', t('qa_photo'), '#/photos?add=1'),
        act('clock', t('qa_hours'), '#/website/hours'),
        h('a', { class: 'qa qa-site', href: lang() === 'ar' ? '/' : '/en', target: '_blank', rel: 'noopener' }, ic('external'), h('span', t('open_site')), ic('arrow')));
      const recent = h('section', { class: 'recent', 'aria-labelledby': 'ov-recent' },
        h('h2', { class: 'sec-title', id: 'ov-recent' }, t('ov_recent')),
        s.recent.length
          ? h('ol', { class: 'log' }, s.recent.map((r) => h('li', { class: 'log-row' }, h('span', { class: 'log-t' }, describe(r)), h('time', { class: 'log-when' }, when(r.at)))))
          : h('p', { class: 'dim' }, t('ov_recent_empty')));
      body.replaceChildren(h('div', { class: 'ov-left' }, ledger, quick), recent);
    };

    const load = async () => { draw(await api.get('/api/admin/stats')); };
    await load();
    return { refresh: load };
  },
};
