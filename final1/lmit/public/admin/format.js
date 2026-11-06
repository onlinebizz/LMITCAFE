import { fmt } from '/js/view.js';
import { lang, t } from './i18n.js';

export const money = (n) => fmt(Number(n) || 0);
export const moneyUnit = (n) => `${t('sar')} ${money(n)}`;

// Accepts Arabic-Indic digits and decimal commas. Returns NaN when the text is not a number.
export function parseNum(s) {
  const map = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9, '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };
  let x = String(s ?? '').trim().replace(/[٠-٩۰-۹]/g, (c) => map[c]).replace(/[٫,،]/g, '.').replace(/\s+/g, '');
  if (x === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(x)) return NaN;
  return Number(x);
}

const loc = () => (lang() === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-US');
const TZ = 'Asia/Riyadh';
export const num = (n) => new Intl.NumberFormat(loc()).format(n);

export const utcDate = (s) => new Date(String(s).replace(' ', 'T') + (String(s).endsWith('Z') ? '' : 'Z'));

export function when(s) {
  const d = utcDate(s);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(loc(), { numeric: 'auto' });
  if (diff < 60) return rtf.format(0, 'second') === 'now' ? t('just_now') : t('just_now');
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
  const day = (x) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(x);
  const time = new Intl.DateTimeFormat(loc(), { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d);
  const today = day(new Date());
  const yest = day(new Date(Date.now() - 86400000));
  if (day(d) === today) return `${rtf.format(0, 'day')} ${time}`;
  if (day(d) === yest) return `${rtf.format(-1, 'day')} ${time}`;
  return new Intl.DateTimeFormat(loc(), { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(d);
}

export const todayLong = () => new Intl.DateTimeFormat(loc(), { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export function kb(bytes) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const pickName = (o, key = 'name') => {
  const ar = o[`${key}_ar`] || '';
  const en = o[`${key}_en`] || '';
  return lang() === 'ar' ? ar || en : en || ar;
};
export const otherName = (o, key = 'name') => {
  const ar = o[`${key}_ar`] || '';
  const en = o[`${key}_en`] || '';
  return lang() === 'ar' ? (ar && en ? en : '') : (ar && en ? ar : '');
};
