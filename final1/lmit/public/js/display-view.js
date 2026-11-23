// Shared server/browser markup for the customer-facing counter display.
import { esc, names, imgHtml, menuPrice, wordmark } from './view.js';

export function displayNav(categories, active, lang) {
  return categories.filter((category) => category.products?.length).map((category) =>
    `<button type="button" class="screen-category" data-screen-category="${category.id}"${category.id === active ? ' aria-current="true"' : ''}>${esc(names(category, lang).p)}</button>`).join('');
}

export function displayGallery(categories, lang) {
  const groups = categories.filter((category) => category.products?.length);
  if (!groups.length) return `<div class="screen-empty">${lang === 'ar' ? 'القائمة تحت التحديث. أهلاً بكم في فارفيلي.' : 'Our menu is being updated. Welcome to Farfalli.'}</div>`;
  return groups.map((category) => {
    const n = names(category, lang);
    return `<section class="screen-group" id="screen-cat-${category.id}" data-category="${category.id}" aria-labelledby="screen-heading-${category.id}">
      <header class="screen-title"><h1 id="screen-heading-${category.id}">${esc(n.p)}</h1>${n.s ? `<p lang="${n.sl}" dir="${n.sl === 'ar' ? 'rtl' : 'ltr'}">${esc(n.s)}</p>` : ''}</header>
      <div class="screen-grid">${category.products.map((product) => {
        const pn = names(product, lang);
        return `<article class="screen-card${product.available ? '' : ' is-sold-out'}">
          <button type="button" class="screen-product" data-screen-product="${product.id}" aria-haspopup="dialog" aria-label="${esc(lang === 'ar' ? `عرض صورة وتفاصيل ${pn.p}` : `View photo and details for ${pn.p}`)}">
            <span class="screen-photo${product.image ? '' : ' has-no-photo'}">${product.image ? imgHtml(product.image, { lang, sizes: '(min-width:1600px) 450px, (min-width:760px) 350px, 48vw' }) : '<img class="screen-photo-mark" src="/brand/farfalli.svg" alt="" width="64" height="64">'}</span>
            <span class="screen-card-body"><span class="screen-card-names"><span class="screen-product-name" role="heading" aria-level="2">${esc(pn.p)}</span>${pn.s ? `<span class="screen-product-secondary" lang="${pn.sl}" dir="${pn.sl === 'ar' ? 'rtl' : 'ltr'}">${esc(pn.s)}</span>` : ''}</span>${menuPrice(product.price, lang)}${!product.available ? `<span class="screen-sold-out">${lang === 'ar' ? 'غير متوفر' : 'Sold out'}</span>` : ''}</span>
          </button>
        </article>`;
      }).join('')}</div>
    </section>`;
  }).join('');
}

export function renderScreen(site, categories, lang) {
  const otherLang = lang === 'ar' ? 'en' : 'ar';
  const first = categories.find((category) => category.products?.length);
  return `<div class="counter-screen">
    <header class="screen-header">${wordmark}<a class="screen-language" href="${otherLang === 'ar' ? '/screen' : '/en/screen'}" lang="${otherLang}" dir="${otherLang === 'ar' ? 'rtl' : 'ltr'}">${otherLang === 'en' ? 'English' : 'العربية'}</a></header>
    <div class="screen-layout"><div class="screen-main" id="screen-panel" tabindex="0" role="region" aria-label="${lang === 'ar' ? 'قائمة فارفيلي، مرّر لعرض المنتجات' : 'Farfalli menu, scroll to browse products'}">${displayGallery(categories, lang)}</div>
      <aside class="screen-sidebar"><p class="screen-kicker">${lang === 'ar' ? 'قائمتنا' : 'OUR MENU'}</p><nav id="screen-categories" aria-label="${lang === 'ar' ? 'الأقسام' : 'Categories'}">${displayNav(categories, first?.id, lang)}</nav><p class="screen-brand-line" lang="en" dir="ltr">Italian kitchen &amp; café<br>Abha</p></aside></div>
    <footer class="screen-footer"><button type="button" id="screen-fullscreen">${lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}</button></footer>
  </div>`;
}
