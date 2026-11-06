// Language state and message lookup. All visible strings live in strings.js (ar and en).
import { STRINGS } from './strings.js';

let current = 'ar';
try { const s = localStorage.getItem('lmit_admin_lang'); if (s === 'en' || s === 'ar') current = s; } catch { /* storage may be blocked */ }

export const lang = () => current;
export function setLang(l) {
  current = l === 'en' ? 'en' : 'ar';
  try { localStorage.setItem('lmit_admin_lang', current); } catch { /* ignore */ }
  applyLang();
}
export function applyLang() {
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
}

const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
export function t(key, vars = {}) {
  const v = STRINGS[current][key] ?? STRINGS.en[key];
  if (v === undefined) { console.warn('missing string', key); return key; }
  return typeof v === 'string' ? fill(v, vars) : key;
}
// plural-aware: the dictionary value is an object keyed by plural category
export function tn(key, n, vars = {}) {
  const v = STRINGS[current][key] ?? STRINGS.en[key];
  if (!v || typeof v === 'string') return t(key, { n, ...vars });
  const cat = new Intl.PluralRules(current).select(n);
  return fill(v[cat] ?? v.other, { n, ...vars });
}

export function errorText(e, ctx = {}) {
  const code = (e && e.code) || 'unknown';
  const f = e && e.field ? fieldLabel(e.field) : t('this_field');
  switch (code) {
    case 'rate_limited': return t('err_rate_limited', { wait: waitText(e.extra && e.extra.retry_after) });
    case 'required': case 'invalid': case 'too_long': return t(`err_${code}`, { field: f });
    case 'bad_credentials': return ctx.passwordChange ? t('err_current_wrong') : t('err_bad_credentials');
    default: return STRINGS.en[`err_${code}`] ? t(`err_${code}`, { field: f }) : t('err_unknown');
  }
}
export function fieldLabel(path) {
  const parts = String(path).split('.');
  let key = parts[parts.length - 1];
  if (/^\d+$/.test(key)) key = parts[0];
  return STRINGS.en[`f_${key}`] ? t(`f_${key}`) : t('this_field');
}
export function waitText(sec) {
  const s = Math.max(1, Number(sec) || 60);
  return s < 90 ? tn('secs', s) : tn('mins', Math.ceil(s / 60));
}
