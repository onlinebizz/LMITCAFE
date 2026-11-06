// Shared server/browser markup for the customer-facing counter display.
import { esc, names, imgHtml, priceHtml, renderStatusChip, ICON } from './view.js';

export function displayPages(categories, size = 6) {
  return categories.flatMap((category) => {
    const items = category.products || [];
    return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => ({
      category, items: items.slice(index * size, (index + 1) * size),
      part: index + 1, parts: Math.ceil(items.length / size),
    }));
  });
}
export function displayPanel(page, lang, size = 6) {
  if (!page) return `<div class="screen-empty">${lang === 'ar' ? 'القائمة تحت التحديث. أهلاً بكم في لميت.' : 'Our menu is being updated. Welcome to LMIT.'}</div>`;
  const n = names(page.category, lang);
  return `<div class="screen-title"><h1>${esc(n.p)}</h1>${n.s ? `<p lang="${n.sl}" dir="${n.sl === 'ar' ? 'rtl' : 'ltr'}">${esc(n.s)}</p>` : ''}<span class="screen-page-count" dir="ltr">${page.part} / ${page.parts}</span></div>
    <div class="screen-grid" data-size="${size}">${page.items.map((product) => {
      const pn = names(product, lang);
      return `<article class="screen-card ${product.available ? '' : 'is-sold-out'}">
        <div class="screen-photo">${product.image ? imgHtml(product.image, { lang, sizes: '(min-width:1600px) 420px, 300px', eager: true }) : '<img class="screen-photo-mark" src="/brand/logo-mark-cream.png" alt="" width="80" height="80">'}</div>
        <div class="screen-card-body"><h2>${esc(pn.p)}</h2>${pn.s ? `<p lang="${pn.sl}" dir="${pn.sl === 'ar' ? 'rtl' : 'ltr'}">${esc(pn.s)}</p>` : ''}<div class="screen-card-bottom">${priceHtml(product.price, lang)}${!product.available ? `<span class="screen-sold-out">${lang === 'ar' ? 'غير متوفر' : 'Sold out'}</span>` : ''}</div></div>
      </article>`;
    }).join('')}</div>`;
}
export function displayNav(categories, active, lang) {
  return categories.filter((category) => category.products?.length).map((category) =>
    `<button type="button" class="screen-category" data-screen-category="${category.id}"${category.id === active ? ' aria-current="true"' : ''}>${esc(names(category, lang).p)}</button>`).join('');
}
export function renderScreen(site, categories, lang, origin) {
  const pages = displayPages(categories);
  const first = pages[0];
  const otherLang = lang === 'ar' ? 'en' : 'ar';
  const otherUrl = otherLang === 'ar' ? '/screen' : '/en/screen';
  const menuUrl = `${origin}${lang === 'ar' ? '/menu' : '/en/menu'}`;
  return `<div class="counter-screen">
    <header class="screen-header"><img src="/brand/logo-lockup-cream.png" width="240" height="97" alt="LMIT"><div id="screen-status">${renderStatusChip(site, lang)}</div><a class="screen-language" href="${otherUrl}" lang="${otherLang}">${otherLang === 'en' ? 'English' : 'العربية'}</a></header>
    <div class="screen-layout"><section class="screen-main" id="screen-panel" aria-label="${lang === 'ar' ? 'قائمة لميت' : 'LMIT menu'}">${displayPanel(first, lang)}</section><aside class="screen-sidebar"><p class="screen-kicker">${lang === 'ar' ? 'قائمتنا' : 'OUR MENU'}</p><nav id="screen-categories" aria-label="${lang === 'ar' ? 'الأقسام' : 'Categories'}">${displayNav(categories, first?.category.id, lang)}</nav><p class="screen-brand-line" lang="en">Good coffee,<br>better days.</p></aside></div>
    <footer class="screen-footer"><div class="screen-controls"><button type="button" class="screen-prev" id="screen-prev" aria-label="${lang === 'ar' ? 'الصفحة السابقة' : 'Previous page'}">${ICON.arrow}</button><button type="button" id="screen-pause" aria-pressed="false">${lang === 'ar' ? 'إيقاف مؤقت' : 'Pause'}</button><button type="button" id="screen-next" aria-label="${lang === 'ar' ? 'الصفحة التالية' : 'Next page'}">${ICON.arrow}</button></div><a class="screen-phone-link" href="${esc(menuUrl)}" target="_blank" rel="noopener"><span>${lang === 'ar' ? 'القائمة على جوالك' : 'The menu on your phone'}</span><b dir="ltr">${esc(new URL(menuUrl).host)}/menu</b></a><button type="button" id="screen-fullscreen">${lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}</button><progress id="screen-progress" max="1" value="0" aria-label="${lang === 'ar' ? 'الوقت حتى الصفحة التالية' : 'Time until next page'}"></progress></footer>
  </div>`;
}
