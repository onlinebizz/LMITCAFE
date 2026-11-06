// Browse-only customer menu. No cart, checkout, quantities or order storage.
import { start } from './shell.js';
import { t, esc, ICON, renderMenuSections, renderRail, imgHtml, priceHtml, names } from './view.js';

const lang = document.documentElement.lang;
let cats = JSON.parse(document.getElementById('boot')?.textContent || '{}').categories || [];
let products = new Map();
let observer;
const content = document.getElementById('menu-root');
const search = document.getElementById('q');
let clear = document.getElementById('q-clear');
const noResults = document.getElementById('no-results');
let resultCount = document.getElementById('result-count');
// Keep assets compatible during Cloudflare's rolling Durable Object updates.
if (!clear) {
  clear = document.createElement('button');
  clear.id = 'q-clear';
  clear.type = 'button';
  clear.hidden = true;
  clear.setAttribute('aria-label', lang === 'ar' ? 'مسح البحث' : 'Clear search');
  clear.innerHTML = ICON.close;
  search.parentElement.append(clear);
}
if (!resultCount) {
  resultCount = document.createElement('p');
  resultCount.className = 'sr';
  resultCount.id = 'result-count';
  resultCount.setAttribute('role', 'status');
  search.parentElement.after(resultCount);
}
const norm = (value) => String(value).toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0300-\u036f]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');

function index() {
  products = new Map(cats.flatMap((category) => category.products.map((product) => [product.id, product])));
}
function filter() {
  const query = norm(search.value.trim());
  let count = 0;
  for (const section of content.querySelectorAll('.cat')) {
    let visible = 0;
    for (const item of section.querySelectorAll('.item')) {
      const match = !query || norm(item.dataset.text).includes(query);
      item.hidden = !match;
      if (match) visible++;
    }
    section.hidden = !!query && !visible;
    count += visible;
  }
  noResults.hidden = !query || count > 0;
  clear.hidden = !search.value;
  resultCount.textContent = query ? (lang === 'ar' ? `${count} من الأصناف` : `${count} items found`) : '';
}
function watchCategories() {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    const entry = entries.filter((item) => item.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!entry) return;
    document.querySelectorAll('.rail-link').forEach((link) => {
      if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-20% 0px -50% 0px', threshold: [0, .1, .5] });
  content.querySelectorAll('.cat').forEach((section) => observer.observe(section));
}
function productDetails(product) {
  const nm = names(product, lang);
  const description = product[`desc_${lang}`] || product.desc_ar || product.desc_en || '';
  const options = (items, label, value) => items?.length ? `<section class="detail-options"><h3>${esc(label)}</h3><ul>${items.map((item) => `<li><span>${esc(item[`name_${lang}`] || item.name_ar)}</span>${priceHtml(value(item), lang)}</li>`).join('')}</ul></section>` : '';
  const dialog = document.createElement('dialog');
  dialog.className = 'sheet browse-sheet';
  dialog.setAttribute('aria-labelledby', 'detail-title');
  dialog.innerHTML = `<div class="sheet-inner"><button type="button" class="sheet-close icon-btn" aria-label="${esc(t(lang, 'close'))}">${ICON.close}</button>
    ${product.image ? imgHtml(product.image, { lang, cls: 'sheet-img', sizes: '560px', eager: true }) : ''}
    <div class="detail-heading"><h2 id="detail-title">${esc(nm.p)}</h2>${priceHtml(product.price, lang)}</div>
    ${nm.s ? `<p class="other-name" lang="${nm.sl}" dir="${nm.sl === 'ar' ? 'rtl' : 'ltr'}">${esc(nm.s)}</p>` : ''}
    ${description ? `<p class="detail-description">${esc(description)}</p>` : ''}
    ${!product.available ? `<p class="detail-unavailable">${esc(t(lang, 'sold_out'))}</p>` : ''}
    ${options(product.variants, lang === 'ar' ? 'الخيارات وفارق السعر' : 'Options and price difference', (v) => v.price_delta)}
    ${options(product.extras, t(lang, 'extras'), (e) => e.price)}
    <p class="detail-note">${lang === 'ar' ? 'للطلب، تفضل عند الكاشير.' : 'Please order at the counter.'}</p></div>`;
  const previous = document.activeElement;
  document.body.append(dialog);
  dialog.querySelector('.sheet-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    dialog.remove();
    document.body.classList.remove('dialog-open');
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
  }, { once: true });
  document.body.classList.add('dialog-open');
  dialog.showModal();
}
index();
content.innerHTML = renderMenuSections(cats, lang);
watchCategories();
search.addEventListener('input', filter);
clear.addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
content.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open]');
  if (button && products.has(Number(button.dataset.open))) productDetails(products.get(Number(button.dataset.open)));
});
start((data) => {
  const focusId = document.activeElement?.closest('[data-open]')?.dataset.open;
  cats = data.cats;
  index();
  content.innerHTML = renderMenuSections(cats, lang);
  document.getElementById('rail').innerHTML = renderRail(cats, lang);
  filter();
  watchCategories();
  if (focusId) content.querySelector(`[data-open="${Number(focusId)}"]`)?.focus({ preventScroll: true });
});
filter();
