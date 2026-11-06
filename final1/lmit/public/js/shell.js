// Keeps header, footer, announcement and opening status current, and refetches content when the owner changes something.
import { renderAnnouncement, renderHeader, renderFooter, renderStatusChip, renderHome } from '/js/view.js';

const lang = document.documentElement.lang;
const body = document.body;
const page = body.dataset.page;
const suffix = body.dataset.suffix;
export const state = { site: null, cats: [], version: 0 };

export async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function load() {
  const [s, m] = await Promise.all([getJson('/api/site'), getJson('/api/menu')]);
  state.site = s;
  state.cats = m.categories;
  state.version = Math.max(s.version, m.version);
}

function paint() {
  body.classList.add('repaint');
  document.getElementById('announce').innerHTML = renderAnnouncement(state.site, lang);
  document.getElementById('top').innerHTML = renderHeader(state.site, lang, page, suffix);
  document.getElementById('foot').innerHTML = renderFooter(state.site, lang);
  if (page === 'home') document.getElementById('main').innerHTML = renderHome(state.site, state.cats, lang);
}

export async function start(onData) {
  try { await load(); } catch { return; }
  setInterval(() => {
    const chip = document.querySelector('[data-status]');
    if (chip && state.site) chip.outerHTML = renderStatusChip(state.site, lang);
  }, 60_000);
  if (!('EventSource' in window)) return;
  let timer;
  const refresh = async () => {
    try { await load(); paint(); if (onData) onData(state); } catch { /* offline: keep what is on screen */ }
  };
  const es = new EventSource('/api/stream');
  es.addEventListener('change', () => { clearTimeout(timer); timer = setTimeout(refresh, 200); });
  es.addEventListener('hello', (e) => {
    let v = 0;
    try { v = JSON.parse(e.data).v; } catch { /* ignore */ }
    if (v && v !== state.version) refresh();
  });
}
