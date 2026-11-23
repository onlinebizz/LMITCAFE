import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const created = '2026-11-23T00:00:00.000Z';
const categories = [
  [1, 'pizza', 'بيتزا', 'Pizza', 'terracotta'],
  [2, 'pasta', 'باستا', 'Pasta', 'brass'],
  [3, 'kitchen', 'المطبخ', 'Kitchen', 'olive'],
  [4, 'cafe', 'الكافيه', 'Café', 'sage'],
].map(([id, slug, name_ar, name_en, accent]) => ({
  id, slug, name_ar, name_en, accent, desc_ar: '', desc_en: '', image_id: null, sort: id * 10, active: 1,
}));

const catalog = [
  [1, 'margherita', 'بيتزا مارغريتا النابولية', 'Neapolitan Margherita', 2048, 1365, 'بيتزا مارغريتا بعجينة نابولية.', 'Margherita on a Neapolitan crust.'],
  [1, 'burrata-pizza', 'بيتزا البوراتا النابولية', 'Neapolitan Burrata', 2048, 1365, 'بوراتا وخضار وطماطم كرزية.', 'Burrata, greens and cherry tomatoes.'],
  [2, 'pollo', 'فارفيلي دي بولو', 'Farfalli di Pollo', 2048, 1365, 'باستا فارفيلي بالدجاج.', 'Farfalli’s chicken pasta.'],
  [2, 'alfredo', 'فتوتشيني ألفريدو', 'Fettuccine Alfredo', 2048, 1365, 'فتوتشيني بصلصة ألفريدو.', 'Fettuccine with Alfredo sauce.'],
  [3, 'salad', 'سلطة فارفيلي', 'Farfalli Salad', 2048, 1365, 'سلطة بالخضار والطماطم وشرائح الجبن.', 'Greens, tomatoes and shaved cheese.'],
  [3, 'arancini', 'أرانشيني', 'Arancini', 2048, 1365, 'كرات أرز إيطالية من قائمة المقبلات.', 'Italian rice balls from the starters menu.'],
  [3, 'salmon', 'سالمون مشوي', 'Grilled Salmon', 2048, 1365, 'يظهر في الصورة مع الأرز والخضار.', 'Pictured with rice and vegetables.'],
  [4, null, 'كابتشينو', 'Cappuccino', 0, 0, 'قهوة ساخنة من قائمة الكافيه.', 'Hot coffee from the café menu.'],
  [4, null, 'موهيتو', 'Mojito', 0, 0, 'مشروب بارد من قائمة الكافيه.', 'A cold drink from the café menu.'],
  [4, null, 'آيس سبانش لاتيه', 'Iced Spanish Latte', 0, 0, 'قهوة باردة من قائمة الكافيه.', 'Iced coffee from the café menu.'],
];

export function buildFarfalliSeed(publicMedia) {
  fs.rmSync(publicMedia, { recursive: true, force: true });
  fs.mkdirSync(publicMedia, { recursive: true });
  const media = [];
  const save = (file, purpose, w, h, alt_ar, alt_en, widths = []) => {
    if (w < 1920 || h < 1080) throw new Error(`Farfalli seed photo must be native Full HD or better: ${file}`);
    const body = fs.readFileSync(path.join(here, 'farfalli-media', `${file}.webp`));
    if (body.toString('utf8', 0, 4) !== 'RIFF' || body.toString('utf8', 8, 12) !== 'WEBP') {
      throw new Error(`Farfalli seed asset is not WebP: ${file}`);
    }
    const key = createHash('sha256').update(body).digest('hex').slice(0, 16);
    fs.writeFileSync(path.join(publicMedia, `${key}-orig.webp`), body);
    for (const width of widths) {
      fs.copyFileSync(path.join(here, 'farfalli-media', `${file}${width === w ? '' : `-${width}`}.webp`), path.join(publicMedia, `${key}-${width}.webp`));
    }
    const id = media.length + 1;
    media.push({ id, key, w, h, widths: JSON.stringify(widths), ext: 'webp', bytes: body.length, purpose, alt_ar, alt_en, created_at: created });
    return id;
  };

  const products = catalog.map(([category_id, file, name_ar, name_en, w, h, desc_ar, desc_en], i) => ({
    id: i + 1, category_id, name_ar, name_en, price: 0, desc_ar, desc_en,
    image_id: file ? save(file, 'product', w, h, name_ar, name_en, [780, 2048]) : null,
    sort: (i + 1) * 10, available: 1, featured: [1, 2, 4].includes(i) ? 1 : 0, bestseller: 0, created_at: created, updated_at: created,
  }));

  const settings = {
    business: {
      name_ar: 'فارفيلي', name_en: 'Farfalli', tagline_en: 'Italian restaurant & café in Abha',
      address_ar: 'طريق الملك فهد، حي العرين، أبها ٦٢٥٢٨ · بجوار بروست المدينة',
      address_en: 'King Fahd Road, Al Arin, Abha 62528 · Next to Broast Almadina',
      phone: '+966 53 903 9390', whatsapp: '', email: '', maps_url: 'https://g.page/Farfalli?share',
    },
    hero: {
      title_ar: 'نكهة إيطاليا في أبها.', title_en: 'A taste of Italy in Abha.',
      sub_ar: 'بيتزا وباستا، ووقت لفنجان قهوة. تجد فارفيلي على طريق الملك فهد في أبها.',
      sub_en: 'Pizza, pasta and a pause for coffee. Find Farfalli on King Fahd Road in Abha.',
      image_id: products[0].image_id,
    },
    values: [],
    gallery: { image_ids: [] },
    social: {},
    hours: Array.from({ length: 7 }, (_, day) => ({ day, closed: false, ranges: [] })),
    announcement: { active: false, text_ar: '', text_en: '', link_url: '' },
    orders: { enabled: false, note_ar: '', note_en: '' },
    seo: {
      desc_ar: 'دليل مستقل لمطعم وكافيه فارفيلي الإيطالي في أبها. مختارات من القائمة، العنوان، ورقم التواصل.',
      desc_en: 'An independent guide to Farfalli in Abha, with selected Italian dishes, café drinks, directions and contact details.',
    },
    screen: { auto_scroll: false },
  };
  return { media, categories, products, variants: [], extras: [], settings: Object.entries(settings).map(([key, value]) => ({ key, value: JSON.stringify(value) })), meta: [{ key: 'seeded', value: '1' }] };
}
