// Shared by the server (first paint) and the browser (live updates). Pure functions, no DOM access.

export const TZ = 'Asia/Riyadh';

export const S = {
  ar: {
    skip: 'انتقل إلى المحتوى',
    nav_menu: 'القائمة', nav_wall: 'المكان', nav_visit: 'زيارتنا', nav_home: 'الرئيسية',
    lang_switch: 'English', lang_switch_label: 'View this page in English',
    open_now: 'مفتوح الآن', closed_now: 'مغلق الآن', until: 'حتى {t}', opens_at: 'يفتح {t}', opens_day: 'يفتح {d} {t}', today: 'اليوم',
    hero_cta: 'تصفح القائمة', hero_map: 'افتح الخريطة',
    picks: 'المختارات', bestseller: 'الأكثر طلباً', menu_title: 'القائمة', wall_title: 'على جدار لميت',
    visit_title: 'زيارتنا', hours_title: 'أوقات العمل', address_title: 'العنوان', open_maps: 'افتح في خرائط جوجل', call: 'اتصل بنا',
    follow: 'تابعنا', to: 'إلى', sold_out: 'غير متوفر', all_menu: 'القائمة كاملة',
    search_label: 'ابحث في القائمة', search_ph: 'ابحث عن مشروب أو حلى', no_results: 'لم نجد شيئاً بهذا الاسم. جرّب كلمة أخرى.',
    categories: 'أقسام القائمة', add: 'أضف', add_aria: 'أضف {n} إلى الطلب', details: 'تفاصيل {n}',
    options: 'الخيارات', extras: 'الإضافات', add_to_order: 'أضف إلى الطلب', close: 'إغلاق',
    qty: 'الكمية', qty_up: 'زيادة الكمية', qty_down: 'تقليل الكمية', remove: 'حذف',
    cart_bar: 'عرض الطلب', your_order: 'طلبك', order_empty: 'الطلب فارغ. أضف مشروباً أو حلى من القائمة.',
    total: 'المجموع', clear: 'إفراغ الطلب', show_counter: 'اعرضه عند الكاشير', send_order: 'أرسل الطلب',
    slip_title: 'اعرض هذه الشاشة عند الكاشير', back_to_order: 'العودة إلى الطلب', done: 'تم',
    name: 'الاسم', phone: 'رقم الجوال', note: 'ملاحظات', note_ph: 'مثال: بدون سكر',
    order_sent: 'وصل طلبك', order_number: 'رقم طلبك', order_show: 'اعرض هذا الرقم عند الاستلام.',
    unavailable_in_cart: 'غير متوفر الآن', pick_option: 'اختر أحد الخيارات', price_from: 'يبدأ من',
    err_generic: 'تعذر إكمال الطلب. حاول مرة ثانية.', err_name: 'اكتب اسمك لإرسال الطلب.', err_offline: 'لا يوجد اتصال. تحقق من الإنترنت وحاول مرة ثانية.',
    sar: '\u20c1', rights: 'جميع الحقوق محفوظة', top: 'إلى الأعلى',
    not_found_title: 'الصفحة غير موجودة', not_found_text: 'ربما تغيّر الرابط. القائمة تبدأ من هنا.',
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    am: 'ص', pm: 'م', closed: 'مغلق',
  },
  en: {
    skip: 'Skip to content',
    nav_menu: 'Menu', nav_wall: 'The place', nav_visit: 'Visit', nav_home: 'Home',
    lang_switch: 'العربية', lang_switch_label: 'عرض الصفحة بالعربية',
    open_now: 'Open now', closed_now: 'Closed now', until: 'until {t}', opens_at: 'opens {t}', opens_day: 'opens {d} {t}', today: 'Today',
    hero_cta: 'Browse the menu', hero_map: 'Open the map',
    picks: 'Picks', bestseller: 'Bestseller', menu_title: 'The menu', wall_title: 'On our wall',
    visit_title: 'Visit us', hours_title: 'Opening hours', address_title: 'Address', open_maps: 'Open in Google Maps', call: 'Call us',
    follow: 'Follow us', to: 'to', sold_out: 'Sold out', all_menu: 'Full menu',
    search_label: 'Search the menu', search_ph: 'Search for a drink or dessert', no_results: 'Nothing matches that search. Try another word.',
    categories: 'Menu sections', add: 'Add', add_aria: 'Add {n} to your order', details: 'Details for {n}',
    options: 'Options', extras: 'Extras', add_to_order: 'Add to order', close: 'Close',
    qty: 'Quantity', qty_up: 'Increase quantity', qty_down: 'Decrease quantity', remove: 'Remove',
    cart_bar: 'View order', your_order: 'Your order', order_empty: 'Your order is empty. Add a drink or dessert from the menu.',
    total: 'Total', clear: 'Clear order', show_counter: 'Show at the counter', send_order: 'Send order',
    slip_title: 'Show this screen at the counter', back_to_order: 'Back to your order', done: 'Done',
    name: 'Name', phone: 'Mobile number', note: 'Notes', note_ph: 'For example: no sugar',
    order_sent: 'Order received', order_number: 'Your order number', order_show: 'Show this number when you pick up.',
    unavailable_in_cart: 'Sold out now', pick_option: 'Choose one option', price_from: 'From',
    err_generic: 'The order could not be completed. Try again.', err_name: 'Enter your name to send the order.', err_offline: 'No connection. Check your internet and try again.',
    sar: '\u20c1', rights: 'All rights reserved', top: 'Back to top',
    not_found_title: 'Page not found', not_found_text: 'The link may have changed. The menu starts here.',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    am: 'AM', pm: 'PM', closed: 'Closed',
  },
};
export const t = (lang, key, vars = {}) => {
  const value = S[lang][key] ?? key;
  return Array.isArray(value) ? value : String(value).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
};

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dir = (lang) => (lang === 'ar' ? 'rtl' : 'ltr');
export const basePath = (lang) => (lang === 'en' ? '/en' : '');
export const homePath = (lang) => (lang === 'en' ? '/en' : '/');
export const menuPath = (lang) => `${basePath(lang)}/menu`;

// primary and secondary names: the page language leads, the other language follows when present
export function names(o, lang, key = 'name') {
  const ar = o[`${key}_ar`] || '';
  const en = o[`${key}_en`] || '';
  if (lang === 'ar') return { p: ar || en, s: ar && en ? en : '', sl: 'en' };
  return { p: en || ar, s: en && ar ? ar : '', sl: 'ar' };
}
const sec = (n) => (n.s ? `<span class="n2" lang="${n.sl}" dir="${dir(n.sl)}">${esc(n.s)}</span>` : '');

export const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
export const priceHtml = (n, lang) => `<span class="price" dir="ltr"><i class="riyal" aria-label="${lang === 'ar' ? 'ريال سعودي' : 'Saudi riyals'}">${esc(t(lang, 'sar'))}</i> <b>${fmt(n)}</b></span>`;

// ---------- images ----------
const mediaUrl = (img, w) => (img.widths && img.widths.length ? `/media/${img.key}-${w}.webp` : `/media/${img.key}-orig.${img.ext}`);
export function imgHtml(img, { lang = 'ar', sizes = '100vw', cls = '', eager = false, decorative = false } = {}) {
  if (!img) return '';
  const ws = img.widths && img.widths.length ? img.widths : [];
  const srcset = ws.length ? ` srcset="${ws.map((w) => `${mediaUrl(img, w)} ${w}w`).join(', ')}" sizes="${esc(sizes)}"` : '';
  const pick = ws.length ? ws.filter((w) => w <= 800).pop() || ws[0] : 0;
  const alt = decorative ? '' : lang === 'ar' ? img.alt_ar || img.alt_en : img.alt_en || img.alt_ar;
  const size = img.w && img.h ? ` width="${img.w}" height="${img.h}"` : '';
  return `<img src="${mediaUrl(img, pick)}"${srcset}${size} alt="${esc(alt || '')}"${cls ? ` class="${cls}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

// ---------- icons (drawn for LMIT, stroke only) ----------
const svg = (body, vb = '0 0 48 48', extra = '') => `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;
export const ICON = {
  friends: svg('<circle cx="24" cy="15" r="5.5"/><circle cx="10.5" cy="20" r="4"/><circle cx="37.5" cy="20" r="4"/><path d="M14 40c0-6.5 4.4-11 10-11s10 4.500 10 11"/><path d="M3 37c0-4.500 3-7.500 8-7.500"/><path d="M45 37c0-4.500-3-7.500-8-7.500"/>'),
  calm: svg('<path d="M9 22h25v7a11 11 0 0 1-11 11h-3A11 11 0 0 1 9 29z"/><path d="M34 25h3a4.500 4.500 0 0 1 0 9h-3"/><path d="M16 8c-2.500 3.500 2.500 4.500 0 8M23 6c-2.500 3.500 2.500 5.500 0 9M30 8c-2.500 3.500 2.500 4.500 0 8"/>'),
  oxygen: svg('<path d="M24 43V24"/><path d="M24 33c-8.500 0-13-5-13-13 8.500 0 13 4.500 13 13z"/><path d="M24 28c0-8 4.500-13 13-13 0 8.500-4.500 13-13 13z"/><path d="M15 43h18"/>'),
  bean: svg('<ellipse cx="24" cy="24" rx="10" ry="17" transform="rotate(28 24 24)"/><path d="M17 11c7 6 6 19 14 26"/>'),
  leaf: svg('<path d="M10 38C10 20 20 10 38 10c0 18-10 28-28 28z"/><path d="M10 38 28 20"/>'),
  cup: svg('<path d="M9 18h26v9a12 12 0 0 1-12 12h-2A12 12 0 0 1 9 27z"/><path d="M35 22h3a5 5 0 0 1 0 10h-3"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', '0 0 24 24'),
  minus: svg('<path d="M5 12h14"/>', '0 0 24 24'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>', '0 0 24 24'),
  bag: svg('<path d="M5.500 8h13l-1 12h-11z"/><path d="M9 8a3 3 0 0 1 6 0"/>', '0 0 24 24'),
  pin: svg('<path d="M12 21s-6.500-6-6.500-11a6.500 6.500 0 0 1 13 0c0 5-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.300"/>', '0 0 24 24'),
  phone: svg('<path d="M6 4h3l1.500 4-2 1.300a11 11 0 0 0 5.200 5.200L15.000 12.500 19 14v3a2 2 0 0 1-2 2A13 13 0 0 1 4 6a2 2 0 0 1 2-2z"/>', '0 0 24 24'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', '0 0 24 24', ' class="arrow"'),
  search: svg('<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>', '0 0 24 24'),
  globe: svg('<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c3 3.300 3 13.700 0 17M12 3.500c-3 3.300-3 13.700 0 17"/>', '0 0 24 24'),
};

// ---------- hours ----------
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
export function fmtTime(hhmm, lang) {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  return `${h % 12 || 12}:${m} ${h < 12 ? t(lang, 'am') : t(lang, 'pm')}`;
}
export function riyadhNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}
// returns { open, until:'HH:MM'|null, next:{day,time}|null }
export function openStatus(hours, now = new Date()) {
  const { day, minutes } = riyadhNow(now);
  const nowW = day * 1440 + minutes;
  const spans = [];
  for (const d of hours || []) {
    if (d.closed) continue;
    for (const r of d.ranges || []) {
      const s = toMin(r.open);
      let e = toMin(r.close);
      if (e <= s) e += 1440;
      spans.push({ start: d.day * 1440 + s, end: d.day * 1440 + e, open: r.open, close: r.close, day: d.day });
    }
  }
  for (const sp of spans) {
    for (const off of [0, 10080]) {
      if (nowW + off >= sp.start && nowW + off < sp.end) return { open: true, until: sp.close, next: null };
    }
  }
  let best = null;
  for (const sp of spans) {
    for (const start of [sp.start, sp.start + 10080]) {
      if (start > nowW && (!best || start < best.start)) best = { start, day: sp.day, time: sp.open };
    }
  }
  return { open: false, until: null, next: best ? { day: best.day, time: best.time } : null };
}
export function statusText(status, lang, todayIdx) {
  if (status.open) return { label: t(lang, 'open_now'), detail: t(lang, 'until', { t: fmtTime(status.until, lang) }) };
  if (!status.next) return { label: t(lang, 'closed_now'), detail: '' };
  const sameDay = status.next.day === todayIdx;
  const detail = sameDay ? t(lang, 'opens_at', { t: fmtTime(status.next.time, lang) })
    : t(lang, 'opens_day', { d: t(lang, 'days')[status.next.day], t: fmtTime(status.next.time, lang) });
  return { label: t(lang, 'closed_now'), detail };
}
const ORDER = [6, 0, 1, 2, 3, 4, 5]; // the Saudi week starts on Saturday
export function groupHours(hours) {
  const byDay = new Map((hours || []).map((d) => [d.day, d]));
  const key = (d) => (!d || d.closed || !d.ranges.length ? 'closed' : d.ranges.map((r) => `${r.open}-${r.close}`).join('|'));
  const groups = [];
  for (const idx of ORDER) {
    const d = byDay.get(idx);
    const k = key(d);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.days.push(idx);
    else groups.push({ key: k, days: [idx], ranges: d && !d.closed ? d.ranges : [] });
  }
  return groups;
}

// ---------- shell ----------
function langSwitch(lang, pathSuffix) {
  const other = lang === 'ar' ? 'en' : 'ar';
  const href = other === 'en' ? `/en${pathSuffix === '/' ? '' : pathSuffix}` : pathSuffix || '/';
  return `<a class="lang" href="${href}" hreflang="${other}" lang="${other}" aria-label="${esc(t(lang, 'lang_switch_label'))}">${esc(t(lang, 'lang_switch'))}</a>`;
}

export function renderAnnouncement(site, lang) {
  const a = site.announcement;
  const text = a && a.active ? (lang === 'ar' ? a.text_ar || a.text_en : a.text_en || a.text_ar) : '';
  if (!text) return '';
  const inner = a.link_url ? `<a href="${esc(a.link_url)}">${esc(text)}</a>` : `<span>${esc(text)}</span>`;
  return `<div class="announce" role="region" aria-label="${esc(text)}">${inner}</div>`;
}

export function renderHeader(site, lang, page, suffix) {
  const b = site.business || {};
  const home = homePath(lang);
  const nm = lang === 'ar' ? b.name_ar || b.name_en : b.name_en || b.name_ar;
  const links = page === 'home'
    ? `<a href="#wall">${esc(t(lang, 'nav_wall'))}</a><a href="#visit">${esc(t(lang, 'nav_visit'))}</a>`
    : `<a href="${home}">${esc(t(lang, 'nav_home'))}</a><a href="${home === '/' ? '' : home}/#visit">${esc(t(lang, 'nav_visit'))}</a>`.replace('//#', '/#');
  return `<div class="bar">
    <a class="brand" href="${home}" aria-label="${esc(nm)}"><img src="/brand/logo-lockup-cream.png" width="240" height="97" alt="${esc(nm)}"></a>
    <nav class="links" aria-label="${esc(t(lang, 'nav_menu'))}">${links}</nav>
    <div class="bar-end">${langSwitch(lang, suffix)}<a class="btn btn-brass btn-sm" href="${menuPath(lang)}"${page === 'menu' ? ' aria-current="page"' : ''}>${esc(t(lang, 'nav_menu'))}</a></div>
  </div>`;
}

const SOCIAL = [['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['snapchat', 'Snapchat'], ['x', 'X'], ['facebook', 'Facebook'], ['linktree', 'Linktree']];
export function socialLinks(site) {
  return SOCIAL.filter(([k]) => site.social && site.social[k]).map(([k, label]) => `<a class="chip" href="${esc(site.social[k])}" target="_blank" rel="noopener">${label}</a>`).join('');
}

export function renderFooter(site, lang) {
  const b = site.business || {};
  const home = homePath(lang);
  const tag = b.tagline_en || '';
  return `<div class="foot-in">
    <img class="foot-logo" src="/brand/logo-lockup-cream.png" width="300" height="121" alt="${esc(lang === 'ar' ? b.name_ar : b.name_en)}" loading="lazy">
    <div class="foot-cols">
      <nav aria-label="${esc(t(lang, 'nav_menu'))}" class="foot-links"><a href="${menuPath(lang)}">${esc(t(lang, 'nav_menu'))}</a><a href="${home === '/' ? '' : home}/#visit">${esc(t(lang, 'nav_visit'))}</a></nav>
      <div class="foot-social">${socialLinks(site)}</div>
    </div>
    <p class="foot-note"><span lang="en" dir="ltr">${esc(tag)}</span><span>&copy; ${new Date().getFullYear()} ${esc(lang === 'ar' ? b.name_ar : b.name_en)}. ${esc(t(lang, 'rights'))}.</span></p>
  </div>`;
}

// ---------- home ----------
function productCard(p, lang) {
  const n = names(p, lang);
  const big = p.image && p.image.w >= 500;
  const img = p.image ? `<span class="pick-img${big ? '' : ' is-small'}">${imgHtml(p.image, { lang, sizes: '240px', decorative: true })}</span>` : '';
  return `<a class="pick" href="${menuPath(lang)}#p-${p.id}" data-accent="${esc(p.accent || 'brass')}">${img}<span class="pick-body"><span class="n1">${esc(n.p)}</span>${sec(n)}${priceHtml(p.price, lang)}</span></a>`;
}

export function renderStatusChip(site, lang, now = new Date()) {
  const st = openStatus(site.hours, now);
  const tx = statusText(st, lang, riyadhNow(now).day);
  return `<p class="status ${st.open ? 'is-open' : 'is-closed'}" data-status><span class="dot" aria-hidden="true"></span><b>${esc(tx.label)}</b>${tx.detail ? `<span>${esc(tx.detail)}</span>` : ''}</p>`;
}

export function renderHours(site, lang, now = new Date()) {
  const todayIdx = riyadhNow(now).day;
  const rows = groupHours(site.hours).map((g) => {
    const first = t(lang, 'days')[g.days[0]];
    const label = g.days.length === 1 ? first : `${first} ${t(lang, 'to')} ${t(lang, 'days')[g.days[g.days.length - 1]]}`;
    const time = g.ranges.length ? g.ranges.map((r) => `<span class="rng">${esc(fmtTime(r.open, lang))} ${esc(t(lang, 'to'))} ${esc(fmtTime(r.close, lang))}</span>`).join('') : `<span class="rng">${esc(t(lang, 'closed'))}</span>`;
    const isToday = g.days.includes(todayIdx);
    return `<li${isToday ? ' class="is-today" aria-current="date"' : ''}><span class="day">${esc(label)}</span><span class="rngs">${time}</span></li>`;
  }).join('');
  return `<ul class="hours">${rows}</ul>`;
}

export function renderHome(site, cats, lang, now = new Date()) {
  const b = site.business || {};
  const h = site.hero || {};
  const title = lang === 'ar' ? h.title_ar : h.title_en;
  const sub = lang === 'ar' ? h.sub_ar : h.sub_en;
  const subLang = lang === 'ar' ? 'en' : 'ar';
  const heroImg = (h.image) || (site.gallery && site.gallery[0]) || null;
  const mapBtn = b.maps_url ? `<a class="btn btn-ghost" href="${esc(b.maps_url)}" target="_blank" rel="noopener">${ICON.pin}<span>${esc(t(lang, 'hero_map'))}</span></a>` : '';

  const hero = `<section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      ${renderStatusChip(site, lang, now)}
      <h1 id="hero-title" class="hero-title">${esc(title)}</h1>
      ${sub ? `<p class="hero-sub" lang="${subLang}" dir="${dir(subLang)}">${esc(sub)}</p>` : ''}
      <div class="hero-cta"><a class="btn btn-brass" href="${menuPath(lang)}"><span>${esc(t(lang, 'hero_cta'))}</span>${ICON.arrow}</a>${mapBtn}</div>
    </div>
    ${heroImg ? `<div class="hero-pane"><div class="pane">${imgHtml(heroImg, { lang, sizes: '(min-width: 900px) 440px, 80vw', eager: true })}</div></div>` : ''}
  </section>`;

  const doors = cats.length ? `<section class="doors" aria-labelledby="doors-t"><h2 id="doors-t" class="sec-title">${esc(t(lang, 'menu_title'))}</h2>
    <ul class="door-grid">${cats.map((c) => {
      const n = names(c, lang);
      const d = lang === 'ar' ? c.desc_ar : c.desc_en;
      return `<li data-accent="${esc(c.accent)}"><a class="door" href="${menuPath(lang)}#cat-${esc(c.slug)}"><span class="door-name">${esc(n.p)}</span>${sec(n)}${d ? `<span class="door-desc">${esc(d)}</span>` : ''}${ICON.arrow}</a></li>`;
    }).join('')}</ul></section>` : '';

  const picks = [];
  for (const c of cats) for (const p of c.products) if ((p.featured || p.bestseller) && p.available) picks.push({ ...p, accent: c.accent });
  const picksHtml = picks.length ? `<section class="picks" aria-labelledby="picks-t"><h2 id="picks-t" class="sec-title">${esc(t(lang, 'picks'))}</h2><div class="pick-rail">${picks.map((p) => productCard(p, lang)).join('')}</div></section>` : '';

  const promos = (site.promotions || []).length ? `<section class="promos" aria-label="${esc(t(lang, 'picks'))}">${site.promotions.map((p) => {
    const ttl = lang === 'ar' ? p.title_ar || p.title_en : p.title_en || p.title_ar;
    const txt = lang === 'ar' ? p.text_ar || p.text_en : p.text_en || p.text_ar;
    const cta = lang === 'ar' ? p.cta_ar || p.cta_en : p.cta_en || p.cta_ar;
    return `<article class="promo">${p.image ? `<div class="promo-img">${imgHtml(p.image, { lang, sizes: '(min-width: 800px) 40vw, 100vw', decorative: true })}</div>` : ''}<div class="promo-body"><h3>${esc(ttl)}</h3>${txt ? `<p>${esc(txt)}</p>` : ''}${p.link_url && cta ? `<a class="btn btn-forest btn-sm" href="${esc(p.link_url)}">${esc(cta)}</a>` : ''}</div></article>`;
  }).join('')}</section>` : '';

  const vals = site.values || [];
  const wallImg = (site.gallery || []).find((m) => /window|نافذة/i.test(`${m.alt_en} ${m.alt_ar}`)) || null;
  const wall = vals.length ? `<section class="wall" id="wall" aria-labelledby="wall-t">
    ${wallImg ? `<div class="wall-photo"><div class="pane plain">${imgHtml(wallImg, { lang, sizes: '(min-width: 900px) 380px, 70vw' })}</div></div>` : ''}
    <div class="wall-words"><h2 id="wall-t" class="sec-title">${esc(t(lang, 'wall_title'))}</h2>
      <ul>${vals.map((v) => {
        const n = names(v, lang, 'title');
        const tx = lang === 'ar' ? v.text_ar : v.text_en;
        return `<li><span class="ico">${ICON[v.icon] || ICON.bean}</span><span class="w-text"><span class="w-name">${esc(n.p)}</span>${sec(n)}${tx ? `<span class="w-desc">${esc(tx)}</span>` : ''}</span></li>`;
      }).join('')}</ul></div></section>` : '';

  const rest = (site.gallery || []).filter((m) => m !== wallImg);
  const gallery = rest.length ? `<section class="gallery" aria-label="${esc(t(lang, 'nav_wall'))}"><div class="gal-rail">${rest.map((m) => `<figure class="pane plain">${imgHtml(m, { lang, sizes: '(min-width: 900px) 30vw, 70vw' })}</figure>`).join('')}</div></section>` : '';

  const addr = lang === 'ar' ? b.address_ar || b.address_en : b.address_en || b.address_ar;
  const phoneDigits = (b.phone || '').replace(/[^\d+]/g, '');
  const visit = `<section class="visit" id="visit" aria-labelledby="visit-t"><h2 id="visit-t" class="sec-title">${esc(t(lang, 'visit_title'))}</h2>
    <div class="visit-grid">
      <div class="visit-card"><h3>${esc(t(lang, 'hours_title'))}</h3>${renderHours(site, lang, now)}</div>
      <div class="visit-card"><h3>${esc(t(lang, 'address_title'))}</h3>
        ${addr ? `<p class="addr">${esc(addr)}</p>` : ''}
        <div class="visit-actions">
          ${b.maps_url ? `<a class="btn btn-forest" href="${esc(b.maps_url)}" target="_blank" rel="noopener">${ICON.pin}<span>${esc(t(lang, 'open_maps'))}</span></a>` : ''}
          ${phoneDigits ? `<a class="btn btn-line" href="tel:${esc(phoneDigits)}">${ICON.phone}<span lang="en" dir="ltr">${esc(b.phone.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3'))}</span></a>` : ''}
        </div>
        ${Object.values(site.social || {}).some(Boolean) ? `<p class="follow">${esc(t(lang, 'follow'))}</p><div class="chips">${socialLinks(site)}</div>` : ''}
      </div></div></section>`;

  return `${hero}${doors}${picksHtml}${promos}${wall}${gallery}${visit}`;
}

// ---------- menu page ----------
export function renderRail(cats, lang) {
  return cats.map((c) => `<a class="rail-link" href="#cat-${esc(c.slug)}" data-cat="${esc(c.slug)}" data-accent="${esc(c.accent)}">${esc(names(c, lang).p)}</a>`).join('');
}

function itemRow(p, lang) {
  const n = names(p, lang);
  const d = lang === 'ar' ? p.desc_ar || p.desc_en : p.desc_en || p.desc_ar;
  const thumb = p.image ? `<span class="menu-photo">${imgHtml(p.image, { lang, sizes: '(min-width:1100px) 340px, (min-width:700px) 30vw, 50vw' })}</span>` : `<span class="menu-photo no-photo" aria-label="${lang === 'ar' ? 'لم تضف صورة لهذا الصنف' : 'Product photo not added yet'}"><img src="/brand/logo-mark-forest.png" alt="" width="80" height="80"><small>LMIT</small></span>`;
  const flags = `${p.bestseller ? `<span class="tag tag-best">${esc(t(lang, 'bestseller'))}</span>` : ''}${!p.available ? `<span class="tag tag-out">${esc(t(lang, 'sold_out'))}</span>` : ''}`;
  const text = `${n.p} ${n.s}`.toLowerCase();
  return `<li class="item${p.available ? '' : ' is-out'}" id="p-${p.id}" data-pid="${p.id}" data-text="${esc(text)}">
    <button type="button" class="item-open" data-open="${p.id}" aria-haspopup="dialog" aria-label="${esc(t(lang, 'details', { n: n.p }))}">
      ${thumb}<span class="item-text"><span class="n1">${esc(n.p)}</span>${sec(n)}${d ? `<span class="item-desc">${esc(d)}</span>` : ''}${flags ? `<span class="flags">${flags}</span>` : ''}</span>
      <span class="item-bottom">${priceHtml(p.price, lang)}<span class="item-detail-hint">${lang === 'ar' ? 'التفاصيل' : 'Details'} ${ICON.arrow}</span></span>
    </button>
  </li>`;
}

export function renderMenuSections(cats, lang) {
  return cats.map((c) => {
    const n = names(c, lang);
    const d = lang === 'ar' ? c.desc_ar : c.desc_en;
    return `<section class="cat" id="cat-${esc(c.slug)}" data-cat="${esc(c.slug)}" data-accent="${esc(c.accent)}" aria-labelledby="h-${esc(c.slug)}">
      <header class="cat-head"><h2 id="h-${esc(c.slug)}"><span class="cat-mark" aria-hidden="true"></span><span class="cat-name">${esc(n.p)}</span>${sec(n)}</h2>${d ? `<p class="cat-desc">${esc(d)}</p>` : ''}</header>
      ${c.products.length ? `<ul class="items">${c.products.map((p) => itemRow(p, lang)).join('')}</ul>` : ''}
    </section>`;
  }).join('');
}

// ---------- structured data ----------
export function jsonLd(site, lang, url) {
  const b = site.business || {};
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const spec = [];
  for (const d of site.hours || []) if (!d.closed) for (const r of d.ranges) spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: dayName[d.day], opens: r.open, closes: r.close });
  const data = {
    '@context': 'https://schema.org', '@type': 'CafeOrCoffeeShop', name: b.name_en || b.name_ar, alternateName: b.name_ar,
    url, image: url ? `${new URL(url).origin}/brand/og-image.png` : undefined,
    address: { '@type': 'PostalAddress', streetAddress: b.address_en, addressLocality: 'Al Namas', addressCountry: 'SA' },
    telephone: b.phone || undefined, hasMap: b.maps_url || undefined, openingHoursSpecification: spec,
    sameAs: Object.values(site.social || {}).filter(Boolean),
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
