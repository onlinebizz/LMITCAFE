// Server-rendered public pages. The markup comes from public/js/view.js, the same module the browser uses for live updates.
import { send, sendCompressed, isSecure } from './http.js';
import { publicSite, publicMenu } from './model.js';
import { SITE_URL } from './config.js';
import * as V from '../public/js/view.js';
import { renderScreen } from '../public/js/display-view.js';

const { esc, t } = V;
const dirOf = (l) => (l === 'ar' ? 'rtl' : 'ltr');
const originOf = (req) => SITE_URL || `${isSecure(req) ? 'https' : 'http'}://${req.headers.host || 'localhost'}`;
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

function layout(req, res, o) {
  const { lang, page, suffix, title, desc, main, site, boot, script, status = 200 } = o;
  const origin = originOf(req);
  const pathFor = (l) => (l === 'en' ? `/en${suffix === '/' ? '' : suffix}` : suffix);
  const canon = origin + pathFor(lang);
  const preload = lang === 'ar' ? ['noto-naskh-arabic', 'jost'] : ['bodoni-moda', 'jost'];
  const b = site.business || {};
  const html = `<!doctype html>
<html lang="${lang}" dir="${dirOf(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#082519">
<link rel="canonical" href="${esc(canon)}">
<link rel="alternate" hreflang="ar" href="${esc(origin + pathFor('ar'))}">
<link rel="alternate" hreflang="en" href="${esc(origin + pathFor('en'))}">
<link rel="alternate" hreflang="x-default" href="${esc(origin + pathFor('ar'))}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(b.name_en || b.name_ar)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canon)}">
<meta property="og:locale" content="${lang === 'ar' ? 'ar_SA' : 'en_US'}">
<meta property="og:image" content="${esc(origin)}/brand/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" href="/brand/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/brand/icon-180.png">
${preload.map((f) => `<link rel="preload" href="/fonts/${f}.woff" as="font" type="font/woff" crossorigin>`).join('\n')}
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/site.css">
${page === 'screen' ? '<link rel="stylesheet" href="/css/screen.css">' : ''}
<script type="application/ld+json">${V.jsonLd(site, lang, canon)}</script>
</head>
<body data-page="${page}" data-suffix="${suffix}">
<a class="skip" href="#main">${esc(t(lang, 'skip'))}</a>
<div id="announce">${V.renderAnnouncement(site, lang)}</div>
<header class="top" id="top">${V.renderHeader(site, lang, page, suffix)}</header>
<main id="main">${main}</main>
<footer class="foot" id="foot">${V.renderFooter(site, lang)}</footer>
${boot ? `<script type="application/json" id="boot">${safeJson(boot)}</script>` : ''}
<script type="module" src="${script}"></script>
</body>
</html>`;
  sendCompressed(req, res, status, Buffer.from(html), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
}

const titleOf = (site, lang, part) => {
  const b = site.business || {};
  const name = lang === 'ar' ? b.name_ar || b.name_en : b.name_en || b.name_ar;
  return part ? `${part} | ${name}` : name;
};
const descOf = (site, lang) => {
  const s = site.seo || {};
  return (lang === 'ar' ? s.desc_ar || s.desc_en : s.desc_en || s.desc_ar) || '';
};

function homePage(lang) {
  return ({ req, res }) => {
    const site = publicSite();
    const cats = publicMenu();
    const h = site.hero || {};
    const hero = lang === 'ar' ? h.title_ar : h.title_en;
    layout(req, res, {
      lang, page: 'home', suffix: '/', site, script: '/js/home.js',
      title: titleOf(site, lang, '') + (hero ? ` | ${hero}` : ''), desc: descOf(site, lang), main: V.renderHome(site, cats, lang),
    });
  };
}

function menuPage(lang) {
  return ({ req, res }) => {
    const site = publicSite();
    const cats = publicMenu();
    const main = `<section class="menu-top">
  <h1 class="menu-title">${esc(t(lang, 'menu_title'))}</h1>
  <label class="search"><span class="sr">${esc(t(lang, 'search_label'))}</span>${V.ICON.search}<input type="search" id="q" placeholder="${esc(t(lang, 'search_ph'))}" autocomplete="off" enterkeyhint="search"><button type="button" id="q-clear" hidden aria-label="${lang === 'ar' ? 'مسح البحث' : 'Clear search'}">${V.ICON.close}</button></label>
  <p class="sr" id="result-count" role="status" aria-live="polite"></p>
</section>
<div class="rail-wrap"><nav class="rail" id="rail" aria-label="${esc(t(lang, 'categories'))}">${V.renderRail(cats, lang)}</nav></div>
<div class="menu" id="menu-root">${V.renderMenuSections(cats, lang)}</div>
<p class="menu-empty" id="no-results" hidden>${esc(t(lang, 'no_results'))}</p>`;
    layout(req, res, {
      lang, page: 'menu', suffix: '/menu', site, script: '/js/menu.js', main,
      title: titleOf(site, lang, t(lang, 'menu_title')), desc: descOf(site, lang),
      boot: { orders: site.orders || { enabled: false }, categories: cats },
    });
  };
}

export function notFound(req, res) {
  let site;
  try { site = publicSite(); } catch { site = { business: {}, hero: {}, hours: [], social: {} }; }
  const lang = req.url.startsWith('/en') ? 'en' : 'ar';
  const main = `<section class="lost"><h1 class="menu-title">${esc(t(lang, 'not_found_title'))}</h1><p>${esc(t(lang, 'not_found_text'))}</p><a class="btn btn-brass" href="${V.menuPath(lang)}">${esc(t(lang, 'nav_menu'))}</a></section>`;
  layout(req, res, { lang, page: 'lost', suffix: '/', site, script: '/js/home.js', main, title: titleOf(site, lang, t(lang, 'not_found_title')), desc: '', status: 404 });
}

function screenPage(lang) {
  return ({ req, res }) => {
    const site = publicSite();
    const categories = publicMenu();
    layout(req, res, {
      lang, page: 'screen', suffix: '/screen', site, script: '/js/screen.js',
      main: renderScreen(site, categories, lang, originOf(req)),
      title: titleOf(site, lang, lang === 'ar' ? 'شاشة القائمة' : 'Counter display'),
      desc: descOf(site, lang), boot: { site, categories },
    });
  };
}

export function register(add) {
  add('GET', '/', homePage('ar'));
  add('GET', '/en', homePage('en'));
  add('GET', '/menu', menuPage('ar'));
  add('GET', '/en/menu', menuPage('en'));
  add('GET', '/screen', screenPage('ar'));
  add('GET', '/en/screen', screenPage('en'));
  add('GET', '/robots.txt', ({ req, res }) => {
    send(res, 200, `User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${originOf(req)}/sitemap.xml\n`, { 'Content-Type': 'text/plain; charset=utf-8' });
  });
  add('GET', '/sitemap.xml', ({ req, res }) => {
    const o = originOf(req);
    const urls = [['/', '/en'], ['/menu', '/en/menu']];
    const body = urls.map(([ar, en]) => [ar, en].map((u, i) => `<url><loc>${o}${u}</loc><xhtml:link rel="alternate" hreflang="ar" href="${o}${ar}"/><xhtml:link rel="alternate" hreflang="en" href="${o}${en}"/></url>`).join('')).join('');
    send(res, 200, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`, { 'Content-Type': 'application/xml; charset=utf-8' });
  });
}
