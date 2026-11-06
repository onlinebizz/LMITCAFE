import { start } from './shell.js';
import { displayGallery, displayNav } from './display-view.js';

const lang = document.documentElement.lang;
const boot = JSON.parse(document.getElementById('boot').textContent);
let categories = boot.categories || [];
const panel = document.getElementById('screen-panel');
const nav = document.getElementById('screen-categories');
const pause = document.getElementById('screen-pause');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let autoEnabled = boot.site?.screen?.auto_scroll === true;
let paused = !autoEnabled || motion.matches;
let active;
let wakeLock;
let lastFrame = 0;
let holdUntil = performance.now() + 8000;
let observer;
let remainder = 0;

function setPaused(value) {
  paused = !autoEnabled || value;
  pause.setAttribute('aria-pressed', String(paused));
  pause.hidden = !autoEnabled;
  pause.textContent = paused ? (lang === 'ar' ? 'استئناف التمرير' : 'Resume scrolling') : (lang === 'ar' ? 'إيقاف التمرير' : 'Pause scrolling');
  holdUntil = performance.now() + 3000;
}
function watchGroups() {
  observer?.disconnect();
  observer = new IntersectionObserver((entries) => {
    const visible = [...panel.querySelectorAll('.screen-group')].find((group) =>
      group.getBoundingClientRect().bottom > panel.getBoundingClientRect().top + 100);
    if (!visible || visible.dataset.category === active) return;
    active = visible.dataset.category;
    for (const button of nav.querySelectorAll('button')) {
      if (button.dataset.screenCategory === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }, { root: panel, threshold: [0, .1, .5, 1] });
  panel.querySelectorAll('.screen-group').forEach((group) => observer.observe(group));
}
nav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-screen-category]');
  if (!button) return;
  setPaused(true);
  const group = document.getElementById(`screen-cat-${button.dataset.screenCategory}`);
  if (group) panel.scrollTo({ top: group.offsetTop - panel.offsetTop, behavior: motion.matches ? 'instant' : 'smooth' });
});
for (const type of ['wheel', 'touchstart', 'pointerdown']) panel.addEventListener(type, () => setPaused(true), { passive: true });
panel.addEventListener('keydown', (event) => {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) setPaused(true);
});
pause.addEventListener('click', () => setPaused(!paused));
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
});
