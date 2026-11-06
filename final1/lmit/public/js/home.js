import { start } from '/js/shell.js';

// Scroll reveal: sections rise in as they enter the screen. Content stays visible if anything fails.
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!calm && 'IntersectionObserver' in window) {
  const root = document.documentElement;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  const scan = () => {
    document.querySelectorAll('#main > section:not(.hero), #main .pane.plain').forEach((el) => {
      if (el.dataset.rv) return;
      el.dataset.rv = '1';
      if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('in'); return; }
      el.classList.add('rv');
      io.observe(el);
    });
  };
  root.classList.add('js-reveal');
  const main = document.getElementById('main');
  if (main) new MutationObserver(scan).observe(main, { childList: true });
  scan();
  setTimeout(() => document.querySelectorAll('.rv:not(.in)').forEach((el) => el.classList.add('in')), 6000);
}
start();
