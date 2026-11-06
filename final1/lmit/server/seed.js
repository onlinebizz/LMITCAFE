import fs from 'node:fs';
import path from 'node:path';
import { one, run, tx, setSetting, toHalalas } from './db.js';
import { storeImage } from './images.js';
import { ROOT } from './config.js';
import { hashPassword, checkPasswordPolicy } from './auth.js';
import { DEFAULT_HOURS } from './settings.js';

const ORIG = path.join(ROOT, 'seed', 'originals');
const WORK = path.join(ROOT, 'seed', 'work');

// Menu transcribed from the cafe's printed menu photo. Names and prices are kept exactly as printed.
// [name_en, name_ar, price_sar, optional thumbnail]
const MENU = [
  { slug: 'hot-drinks', ar: 'المشروبات الساخنة', en: 'Hot Drinks', accent: 'terracotta', items: [
    ['Coffee of the Day', 'قهوة اليوم', 10], ['Americano', 'أمريكانو', 11], ['Macchiato', 'ميكاتو', 12], ['Cortado', 'كورتادو', 13],
    ['Cappuccino', 'كابتشينو', 14], ['Latte', 'لاتيه', 14], ['Flat White', 'فلات وايت', 15], ['Spanish Latte', 'سبانش لاتيه', 16],
    ['Mocha', 'موكا', 16], ['Pistachio Latte', 'بيستاشيو لاتيه', 16], ['Hot Chocolate', 'هوت شوكليت', 14],
  ] },
  { slug: 'cold-drinks', ar: 'المشروبات الباردة', en: 'Cold Drinks', accent: 'teal', items: [
    ['Fadha', 'فذه', 18], ['Iced Coffee of the Day', 'قهوة اليوم', 11], ['Iced Americano', 'آيس أمريكانو', 14], ['Iced Latte', 'آيس لاتيه', 15],
    ['Iced Spanish Latte', 'آيس سبانش لاتيه', 18], ['Iced Pistachio Latte', 'آيس بيستاشيو لاتيه', 18], ['Hibiscus', 'كركديه', 17],
    ['Matcha', 'ماتشا', 18], ['Matcha Foam', 'ماتشا فوم', 20], ['Affogato Espresso', 'أفوقاتو اسبريسو', 14], ['Affogato Matcha', 'أفوقاتو ماتشا', 16],
    ['Mojito', 'موهيتو', 11], ['LMIT Mojito', 'موهيتو لميت', 15], ['Alfredo', 'الفريدو', 14], ['Moment Blanc', 'مومنت بلانك', 21],
    ['Iced Mocha', 'آيس موكا', 18], ['Iced Peach Tea', 'آيس تي خوخ', 18],
  ] },
  { slug: 'desserts', ar: 'الحلويات', en: 'Desserts', accent: 'brass', items: [
    ['Fondue Cake', 'كيكة الفونديو', 19, 'fondue-cake'], ['London Cake', 'كيكة اللندن', 29, 'london-cake'], ['Lmit Cake', 'كيكة Lmit', 32, 'lmit-cake'],
    ['Classic Cookies', 'كوكيز كلاسيك', 10, 'cookies'], ['Double Chocolate Cookies', 'كوكيز دبل شوكليت', 12, 'cookies'],
    ['Classic Chocolate', 'كلاسيك شوكليت', 22, 'classic-chocolate'], ['Cheese Madrid', 'تشيز مدريد', 21, 'cheese-madrid'],
    ['Lemon Tiramisu', 'تيراميسو ليمون', 21, 'lemon-tiramisu'], ['Tiramisu', 'تيراميسو', 20, 'tiramisu'], ['Mango Tiramisu', 'تيراميسو مانجو', 23, 'mango-tiramisu'],
    ['4 Mini Pecan Bites', '4 ميني بايتس بيكان', 15, 'pecan-bites'], ['4 Mini Berry Bites', '4 ميني بايتس توت', 14, 'berry-bites'],
    ['4 Mini Bites Pomegranate', '4 ميني بايتس رمان', 14, 'pomegranate-bites'],
  ] },
  { slug: 'v60', ar: 'مشروبات الـ V60', en: 'V60 Drinks', accent: 'sage', desc_ar: 'يوجد لدينا 5 محاصيل.', desc_en: 'Five coffees to choose from.', items: [] },
  { slug: 'espresso', ar: 'الإسبريسو', en: 'Espresso', accent: 'olive', desc_ar: 'يوجد لدينا 7 محاصيل.', desc_en: 'Seven coffees to choose from.', items: [] },
];

const PHOTOS = [
  { file: 'storefront-night.png', purpose: 'banner', alt_ar: 'واجهة لميت ليلاً بحروف ذهبية مضاءة', alt_en: 'The LMIT storefront at night with lit brass lettering' },
  { file: 'storefront-day.png', purpose: 'gallery', alt_ar: 'واجهة لميت بنهار النماص', alt_en: 'The LMIT storefront in daylight' },
  { file: 'counter.png', purpose: 'gallery', alt_ar: 'كاونتر الطلب وبار الإسبريسو', alt_en: 'The order counter and espresso bar' },
  { file: 'window.png', purpose: 'gallery', alt_ar: 'نافذة الصالة وإطلالتها', alt_en: 'The window seat and its view' },
  { file: 'sign.png', purpose: 'gallery', alt_ar: 'لوحة لميت المضيئة', alt_en: 'The lit LMIT sign' },
];

export async function seedIfEmpty() {
  if (one("SELECT value FROM meta WHERE key='seeded'")) return false;

  // photos first (outside the transaction, they run an external process)
  const photoIds = {};
  for (const p of PHOTOS) {
    const row = await storeImage(fs.readFileSync(path.join(ORIG, p.file)), { purpose: p.purpose, alt_ar: p.alt_ar, alt_en: p.alt_en });
    photoIds[p.file] = row.id;
  }
  const thumbIds = {};
  for (const cat of MENU) for (const it of cat.items) {
    const t = it[3];
    if (t && !thumbIds[t]) {
      const row = await storeImage(fs.readFileSync(path.join(WORK, `dessert-${t}.png`)), { purpose: 'product', upscale: 2 });
      thumbIds[t] = row.id;
    }
  }

  tx(() => {
    MENU.forEach((c, ci) => {
      const r = run('INSERT INTO categories(slug,name_ar,name_en,desc_ar,desc_en,accent,sort,active) VALUES(?,?,?,?,?,?,?,1)',
        c.slug, c.ar, c.en, c.desc_ar || '', c.desc_en || '', c.accent, ci + 1);
      const cid = Number(r.lastInsertRowid);
      c.items.forEach((it, i) => {
        run('INSERT INTO products(category_id,name_ar,name_en,price,image_id,sort) VALUES(?,?,?,?,?,?)',
          cid, it[1], it[0], toHalalas(it[2]), it[3] ? thumbIds[it[3]] : null, i + 1);
      });
    });

    // Editorial picks for the homepage, chosen by name only: the cafe's own namesake items and the dessert reviewers mention most.
    run("UPDATE products SET featured=1 WHERE name_en IN ('Lmit Cake','London Cake','LMIT Mojito')");

    setSetting('business', {
      name_ar: 'لميت', name_en: 'LMIT', tagline_en: 'Light Moments Inspiration Taste',
      address_ar: 'السد، النماص', address_en: 'Al Sad, Al Namas',
      phone: '0590206880', whatsapp: '', email: '',
      maps_url: 'https://maps.app.goo.gl/togLAnG4xdoAExsQ9',
    });
    setSetting('hero', {
      title_ar: 'قهوتك اليوم وكل يوم', title_en: 'Good coffee, better days',
      sub_ar: 'Good coffee, better days', sub_en: 'قهوتك اليوم وكل يوم',
      image_id: photoIds['storefront-night.png'],
    });
    setSetting('values', [
      { icon: 'friends', title_ar: 'أصحاب', title_en: 'Friends', text_ar: '', text_en: '' },
      { icon: 'calm', title_ar: 'صفاء', title_en: 'Calm', text_ar: '', text_en: '' },
      { icon: 'oxygen', title_ar: 'أكسجين', title_en: 'Oxygen', text_ar: '', text_en: '' },
    ]);
    setSetting('gallery', { image_ids: ['storefront-day.png', 'counter.png', 'window.png', 'sign.png'].map((f) => photoIds[f]) });
    setSetting('social', { tiktok: 'https://www.tiktok.com/@lmit_cafe', instagram: '', snapchat: '', x: '', facebook: '', linktree: '' });
    setSetting('hours', DEFAULT_HOURS);
    setSetting('announcement', { active: false, text_ar: '', text_en: '', link_url: '' });
    setSetting('orders', { enabled: false, note_ar: '', note_en: '' });
    setSetting('seo', {
      desc_ar: 'لميت مقهى في السد بالنماص. المشروبات الساخنة والباردة والحلويات وأوقات العمل.',
      desc_en: 'LMIT is a cafe in Al Sad, Al Namas. Hot and cold drinks, desserts and opening hours.',
    });
    run("INSERT INTO meta(key,value) VALUES('seeded','1')");
  });
  return true;
}

export function ensureAdminFromEnv() {
  if (one('SELECT id FROM users LIMIT 1')) return;
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || '';
  if (!email || !pw) {
    console.log('\nNo administrator exists yet. Create one with:\n  node scripts/create-admin.js you@example.com "a long password"\n');
    return;
  }
  checkPasswordPolicy(pw);
  run('INSERT INTO users(email,pass) VALUES(?,?)', email, hashPassword(pw));
  console.log(`Administrator created: ${email}`);
}
