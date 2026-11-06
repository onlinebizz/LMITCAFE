import { esc, names, imgHtml, priceHtml } from './view.js';

export function counterDetailMarkup(product, lang) {
  const n = names(product, lang);
  const description = product[`desc_${lang}`] || product.desc_ar || product.desc_en || '';
  const descriptionLang = product[`desc_${lang}`] ? lang : product.desc_ar ? 'ar' : 'en';
  return `<div class="counter-detail-content">
    <div class="counter-detail-layout">
      <div class="counter-detail-photo">${product.image ? imgHtml(product.image, { lang, cls: 'counter-detail-image', sizes: '(min-width:900px) 760px, 95vw', eager: true }) : `<p class="counter-detail-missing">${lang === 'ar' ? 'لم تُضف صورة لهذا الصنف بعد.' : 'A photo has not been added for this product yet.'}</p>`}</div>
      <div class="counter-detail-copy">
        <h2 id="counter-detail-title">${esc(n.p)}</h2>
        ${n.s ? `<p class="counter-detail-secondary" lang="${n.sl}" dir="${n.sl === 'ar' ? 'rtl' : 'ltr'}">${esc(n.s)}</p>` : ''}
        ${priceHtml(product.price, lang)}
        <p class="counter-detail-description${description ? '' : ' is-missing'}" lang="${description ? descriptionLang : lang}" dir="${(description ? descriptionLang : lang) === 'ar' ? 'rtl' : 'ltr'}">${esc(description || (lang === 'ar' ? 'لم يُضف وصف لهذا الصنف بعد.' : 'A description has not been added for this product yet.'))}</p>
        ${!product.available ? `<p class="counter-detail-unavailable">${lang === 'ar' ? 'غير متوفر حاليًا' : 'Currently unavailable'}</p>` : ''}
      </div>
    </div>
    <footer class="counter-detail-footer"><button type="button" data-detail-back>${lang === 'ar' ? 'اضغط هنا للعودة' : 'Click here to go back'}</button></footer>
  </div>`;
}

export function openCounterDetail(product, lang, onClose) {
  const dialog = document.createElement('dialog');
  dialog.className = 'counter-detail';
  dialog.setAttribute('aria-labelledby', 'counter-detail-title');
  dialog.innerHTML = counterDetailMarkup(product, lang);
  dialog.dataset.product = product.id;
  document.body.append(dialog);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-detail-back]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  }, { once: true });
  dialog.showModal();
  dialog.querySelector('[data-detail-back]').focus({ preventScroll: true });
  return dialog;
}
