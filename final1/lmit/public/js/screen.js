import { start } from './shell.js';
import { displayPages, displayPanel, displayNav } from './display-view.js';
import { renderStatusChip } from './view.js';

const lang = document.documentElement.lang;
const boot = JSON.parse(document.getElementById('boot').textContent);
let categories = boot.categories || [];
let site = boot.site || {};
const pageSize = () => innerWidth < 1100 || innerHeight < 700 ? 4 : 6;
let size = pageSize();
let pages = displayPages(categories, size);
let index = 0;
let paused = false;
const supplied = Number(new URLSearchParams(location.search).get('seconds'));
const interval = (Number.isFinite(supplied) && supplied >= 8 && supplied <= 60 ? supplied : 15) * 1000;
let nextAt = performance.now() + interval;
const panel = document.getElementById('screen-panel');
const nav = document.getElementById('screen-categories');
const pause = document.getElementById('screen-pause');
const progress = document.getElementById('screen-progress');
let wakeLock;

function draw() {
  index = pages.length ? ((index % pages.length) + pages.length) % pages.length : 0;
  panel.innerHTML = displayPanel(pages[index], lang, size);
  nav.innerHTML = displayNav(categories, pages[index]?.category.id, lang);
  nextAt = performance.now() + interval;
  progress.value = 0;
  document.getElementById('screen-prev').disabled = pages.length < 2;
  document.getElementById('screen-next').disabled = pages.length < 2;
  pause.disabled = pages.length < 2;
}
function next(direction) { index += direction; draw(); }
function togglePause() {
  paused = !paused;
  pause.setAttribute('aria-pressed', String(paused));
  pause.textContent = paused ? (lang === 'ar' ? 'تشغيل تلقائي' : 'Play') : (lang === 'ar' ? 'إيقاف مؤقت' : 'Pause');
  nextAt = performance.now() + interval;
}
document.getElementById('screen-prev').addEventListener('click', () => next(-1));
document.getElementById('screen-next').addEventListener('click', () => next(1));
pause.addEventListener('click', togglePause);
nav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-screen-category]');
  if (!button) return;
  const found = pages.findIndex((page) => page.category.id === Number(button.dataset.screenCategory));
  if (found >= 0) { index = found; draw(); }
});
async function keepAwake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch { /* Unsupported or power-saving mode. */ }
}
document.getElementById('screen-fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    await keepAwake();
  } catch { /* The display can use browser kiosk mode instead. */ }
});
document.addEventListener('fullscreenchange', () => {
  document.getElementById('screen-fullscreen').textContent = document.fullscreenElement ? (lang === 'ar' ? 'إنهاء ملء الشاشة' : 'Exit fullscreen') : (lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen');
});
document.addEventListener('visibilitychange', () => {
  nextAt = performance.now() + interval;
  if (!document.hidden && document.fullscreenElement) keepAwake();
});
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); next(lang === 'ar' ? -1 : 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); next(lang === 'ar' ? 1 : -1); }
  if (event.key === ' ' && event.target === document.body) { event.preventDefault(); togglePause(); }
});
let resize;
window.addEventListener('resize', () => {
  clearTimeout(resize);
  resize = setTimeout(() => {
    const newSize = pageSize();
    if (newSize === size) return;
    const active = pages[index]?.category.id;
    size = newSize;
    pages = displayPages(categories, size);
    index = Math.max(0, pages.findIndex((page) => page.category.id === active));
    draw();
  }, 150);
});
setInterval(() => {
  if (paused || document.hidden || pages.length < 2) return;
  const remaining = nextAt - performance.now();
  progress.value = Math.max(0, Math.min(1, 1 - remaining / interval));
  if (remaining <= 0) next(1);
}, 250);
draw();
start((data) => {
  const active = pages[index]?.category.id;
  const part = pages[index]?.part;
  categories = data.cats;
  site = data.site;
  pages = displayPages(categories, size);
  index = Math.max(0, pages.findIndex((page) => page.category.id === active && page.part === part));
  document.getElementById('screen-status').innerHTML = renderStatusChip(site, lang);
  draw();
});
