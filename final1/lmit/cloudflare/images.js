import crypto from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { current } from './context.js';
import { one, run, tx } from './db.js';
import { HttpError } from '../.cloudflare/server/http.js';
import { MAX_UPLOAD_BYTES } from './config.js';

const PURPOSES = ['product', 'category', 'banner', 'promo', 'seasonal', 'gallery', 'general'];
export const isPurpose = (purpose) => PURPOSES.includes(purpose);
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let value = i;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
const badImage = () => new HttpError(422, 'bad_image', 'This image could not be read. Choose a JPG, PNG or WebP in the photo uploader.', { field: 'file' });

// The browser decodes JPEG/WebP/PNG and sends a clean canvas PNG. Validate every
// PNG chunk, CRC, decompressed scanline and filter before storing it. SVG, APNG,
// external references, metadata and image-shaped garbage are never persisted.
export function validatePng(data) {
  if (!data?.length) throw new HttpError(400, 'no_file', 'Choose an image to upload.', { field: 'file' });
  if (data.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'too_large', 'Image is larger than 10 MB.', { field: 'file' });
  if (!data.subarray(0, 8).equals(signature)) throw badImage();
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  let ended = false;
  let idatEnded = false;
  const parts = [];
  const clean = [signature];
  while (pos + 12 <= data.length) {
    const length = data.readUInt32BE(pos);
    const end = pos + 12 + length;
    if (end > data.length) throw badImage();
    const type = data.subarray(pos + 4, pos + 8).toString('ascii');
    const payload = data.subarray(pos + 8, pos + 8 + length);
    if (crc32(data.subarray(pos + 4, pos + 8 + length)) !== data.readUInt32BE(pos + 8 + length)) throw badImage();
    if (!width && type !== 'IHDR') throw badImage();
    if (type === 'IHDR') {
      if (width || length !== 13) throw badImage();
      width = payload.readUInt32BE(0); height = payload.readUInt32BE(4);
      channels = payload[9] === 6 ? 4 : payload[9] === 2 ? 3 : 0;
      if (!width || !height || width > 2400 || height > 2400 || !channels ||
          payload[8] !== 8 || payload[10] !== 0 || payload[11] !== 0 || payload[12] !== 0) throw badImage();
      clean.push(data.subarray(pos, end));
    } else if (type === 'IDAT') {
      if (idatEnded) throw badImage();
      parts.push(payload);
      clean.push(data.subarray(pos, end));
    } else if (type === 'IEND') {
      if (length || !parts.length || end !== data.length) throw badImage();
      clean.push(data.subarray(pos, end));
      ended = true;
      break;
    } else {
      if (parts.length) idatEnded = true;
      if (['acTL', 'fcTL', 'fdAT'].includes(type) || /^[A-Z]/.test(type)) throw badImage();
    }
    pos = end;
  }
  if (!ended) throw badImage();
  const stride = width * channels + 1;
  let decoded;
  try { decoded = inflateSync(Buffer.concat(parts), { maxOutputLength: stride * height }); }
  catch { throw badImage(); }
  if (decoded.length !== stride * height) throw badImage();
  for (let row = 0; row < height; row++) if (decoded[row * stride] > 4) throw badImage();
  return { width, height, data: Buffer.concat(clean) };
}

export async function storeImage(buffer, { purpose = 'general', alt_ar = '', alt_en = '' } = {}) {
  const image = validatePng(buffer);
  const key = crypto.createHash('sha256').update(image.data).digest('hex').slice(0, 16);
  const existing = one('SELECT * FROM media WHERE key=?', key);
  if (existing) return existing;
  return tx(() => {
    const result = run('INSERT INTO media(key,w,h,widths,ext,bytes,purpose,alt_ar,alt_en) VALUES(?,?,?,?,?,?,?,?,?)',
      key, image.width, image.height, '[]', 'png', image.data.length, isPurpose(purpose) ? purpose : 'general', String(alt_ar).slice(0, 200), String(alt_en).slice(0, 200));
    const id = Number(result.lastInsertRowid);
    // Keep each bound value below SQLite's per-value size limit.
    for (let offset = 0, part = 0; offset < image.data.length; offset += 512 * 1024, part++) {
      const chunk = image.data.subarray(offset, offset + 512 * 1024);
      current().storage.sql.exec('INSERT INTO media_chunks(media_id,part,data) VALUES(?,?,?)', id, part, chunk).toArray();
    }
    return one('SELECT * FROM media WHERE id=?', id);
  });
}
export function deleteMediaFiles() {
  // Chunk rows are removed by the media foreign key in the same transaction.
}
export const mediaObject = (row) => row && ({
  id: row.id, key: row.key, w: row.w, h: row.h, widths: JSON.parse(row.widths || '[]'), ext: row.ext,
  purpose: row.purpose, alt_ar: row.alt_ar, alt_en: row.alt_en, bytes: row.bytes, created_at: row.created_at,
});
