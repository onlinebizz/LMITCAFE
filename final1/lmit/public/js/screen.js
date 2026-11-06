import { start } from './shell.js';
import { displayGallery, displayNav } from './display-view.js';
import { openCounterDetail, counterDetailMarkup } from './counter-detail.js';

const lang = document.documentElement.lang;
const boot = JSON.parse(document.getElementById('boot').textContent);
// A pointer tap must not leave a lingering focus frame on the tapped control.
// The brass outline returns as soon as a keyboard is used again.
const markPointerUse = () => document.documentElement.classList.add('using-pointer');
document.addEventListener('pointerdown', markPointerUse, { capture: true, passive: true });
document.addEventListener('mousedown', markPointerUse, { capture: true, passive: true });
document.addEventListener('keydown', () => document.documentElement.classList.remove('using-pointer'), { capture: true });
let categories = boot.categories || [];
const panel = document.getElementById('screen-panel');
const nav = document.getElementById('screen-categories');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let autoEnabled = boot.site?.screen?.auto_scroll === true;
let paused = !autoEnabled || motion.matches;
let active;
let wakeLock;
let lastFrame = 0;
let holdUntil = performance.now() + 8000;
let navFrame = 0;
let remainder = 0;
let detailDialog;

function setPaused(value) {
  paused = !autoEnabled || value;
  holdUntil = performance.now() + 3000;
}
function watchGroups() {
  const top = panel.getBoundingClientRect().top;
  const visible = [...panel.querySelectorAll('.screen-group')].find((group) =>
    group.getBoundingClientRect().bottom > top + Math.min(100, panel.clientHeight / 3));
  if (!visible || visible.dataset.category === active) return;
  active = visible.dataset.category;
  for (const button of nav.querySelectorAll('button')) {
    if (button.dataset.screenCategory === active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  }
}
// Observe actual scroll positions, including the final fractional pixel of a
// smooth scroll. Intersection thresholds can miss a nearly-out-of-view group.
panel.addEventListener('scroll', () => {
  if (navFrame) return;
  navFrame = requestAnimationFrame(() => { navFrame = 0; watchGroups(); });
}, { passive: true });
window.addEventListener('resize', watchGroups);
nav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-screen-category]');
  if (!button) return;
  setPaused(true);
  const group = document.getElementById(`screen-cat-${button.dataset.screenCategory}`);
  if (group) panel.scrollTo({ top: panel.scrollTop + group.getBoundingClientRect().top - panel.getBoundingClientRect().top, behavior: motion.matches ? 'instant' : 'smooth' });
});
for (const type of ['wheel', 'touchstart', 'pointerdown']) panel.addEventListener(type, () => setPaused(true), { passive: true });
panel.addEventListener('click', (event) => {
  const button = event.target.closest('[data-screen-product]');
  if (!button || detailDialog?.open) return;
  const id = Number(button.dataset.screenProduct);
  const product = categories.flatMap((category) => category.products || []).find((item) => item.id === id);
  if (!product) return;
  setPaused(true);
  const scrollTop = panel.scrollTop;
  detailDialog = openCounterDetail(product, lang, () => {
    detailDialog = null;
    panel.scrollTop = scrollTop;
    (panel.querySelector(`[data-screen-product="${id}"]`) || panel).focus({ preventScroll: true });
  });
});
panel.addEventListener('keydown', (event) => {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) setPaused(true);
});
motion.addEventListener('change', () => { if (motion.matches) setPaused(true); });
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* Unsupported or power-saving mode. */ }
}
document.getElementById('screen-fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    await keepAwake();
  } catch { /* Browser kiosk mode is also supported. */ }
});
document.addEventListener('fullscreenchange', () => {
  document.getElementById('screen-fullscreen').textContent = document.fullscreenElement ? (lang === 'ar' ? 'إنهاء ملء الشاشة' : 'Exit fullscreen') : (lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen');
});
document.addEventListener('visibilitychange', () => {
  lastFrame = 0;
  if (!document.hidden && document.fullscreenElement) keepAwake();
});
function animate(time) {
  const delta = lastFrame ? Math.min(time - lastFrame, 100) : 0;
  lastFrame = time;
  if (!paused && !document.hidden && time > holdUntil && panel.scrollHeight > panel.clientHeight) {
    if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2) {
      panel.scrollTop = 0;
      holdUntil = time + 8000;
    } else {
      remainder += delta * .024;
      const pixels = Math.floor(remainder);
      panel.scrollTop += pixels;
      remainder -= pixels;
    }
  }
  requestAnimationFrame(animate);
}
setPaused(paused);
holdUntil = performance.now() + 8000;
watchGroups();
requestAnimationFrame(animate);
start((data) => {
  const oldTop = panel.scrollTop;
  categories = data.cats;
  const enabled = data.site.screen?.auto_scroll === true;
  if (enabled !== autoEnabled) {
    autoEnabled = enabled;
    setPaused(!enabled || motion.matches);
  }
  panel.innerHTML = displayGallery(categories, lang);
  nav.innerHTML = displayNav(categories, Number(active), lang);
  panel.scrollTop = oldTop;
  watchGroups();
  if (detailDialog?.open) {
    const product = categories.flatMap((category) => category.products || []).find((item) => item.id === Number(detailDialog.dataset.product));
    if (!product) detailDialog.close();
    else {
      detailDialog.innerHTML = counterDetailMarkup(product, lang);
      detailDialog.querySelector('[data-detail-back]').focus({ preventScroll: true });
    }
  }
});
