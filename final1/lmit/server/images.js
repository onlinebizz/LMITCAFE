import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DATA_DIR, ROOT, MAX_UPLOAD_BYTES } from './config.js';
import { one, run } from './db.js';
import { HttpError } from './http.js';

const exec = promisify(execFile);
export const MEDIA_DIR = path.join(DATA_DIR, 'media');
const PURPOSES = ['product', 'category', 'banner', 'promo', 'seasonal', 'gallery', 'general'];
export const isPurpose = (p) => PURPOSES.includes(p);

function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

// Validates, optimises and records an upload. Returns the media row.
export async function storeImage(buf, { purpose = 'general', alt_ar = '', alt_en = '', upscale = 1 } = {}) {
  if (!buf || !buf.length) throw new HttpError(400, 'no_file', 'Choose an image to upload.', { field: 'file' });
  if (buf.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'too_large', 'Image is larger than 10 MB.', { field: 'file' });
  const ext = sniff(buf);
  if (!ext) throw new HttpError(415, 'bad_image', 'Use a JPG, PNG or WebP image.', { field: 'file' });

  const key = crypto.createHash('sha256').update(buf).update(String(upscale)).digest('hex').slice(0, 16);
  const existing = one('SELECT * FROM media WHERE key=?', key);
  if (existing) return existing;

  const tmp = path.join(os.tmpdir(), `lmit-${key}.${ext}`);
  fs.writeFileSync(tmp, buf, { mode: 0o600 });
  let info;
  try {
    try {
      const { stdout } = await exec('python3', ['-I', path.join(ROOT, 'tools', 'imgproc.py'), tmp, MEDIA_DIR, key, String(upscale)], { timeout: 45_000, maxBuffer: 1024 * 1024 });
      info = JSON.parse(stdout.trim().split('\n').pop());
    } catch (e) {
      const out = e.stdout ? String(e.stdout).trim().split('\n').pop() : '';
      if (out.startsWith('{')) info = JSON.parse(out);
      else if (e.code === 'ENOENT') info = null; // no python on this host
      else throw new HttpError(422, 'bad_image', 'This image could not be read. Try another file.', { field: 'file' });
    }
    if (info && info.error) throw new HttpError(info.error === 'format' ? 415 : 422, 'bad_image', 'Use a JPG, PNG or WebP image that opens normally.', { field: 'file' });
    if (!info) {
      // Fallback without Python: keep the validated original, no resizing.
      fs.copyFileSync(tmp, path.join(MEDIA_DIR, `${key}-orig.${ext}`));
      info = { w: 0, h: 0, widths: [] };
    }
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  const useExt = info.widths.length ? 'webp' : ext;
  const purposeSafe = isPurpose(purpose) ? purpose : 'general';
  const r = run(
    'INSERT INTO media(key,w,h,widths,ext,bytes,purpose,alt_ar,alt_en) VALUES(?,?,?,?,?,?,?,?,?)',
    key, info.w, info.h, JSON.stringify(info.widths), useExt, buf.length, purposeSafe, String(alt_ar).slice(0, 200), String(alt_en).slice(0, 200)
  );
  return one('SELECT * FROM media WHERE id=?', Number(r.lastInsertRowid));
}

export function deleteMediaFiles(row) {
  const widths = JSON.parse(row.widths || '[]');
  const names = widths.length ? widths.map((w) => `${row.key}-${w}.webp`) : [`${row.key}-orig.${row.ext}`];
  for (const n of names) fs.rmSync(path.join(MEDIA_DIR, n), { force: true });
}

export const mediaObject = (r) => r && ({
  id: r.id, key: r.key, w: r.w, h: r.h, widths: JSON.parse(r.widths || '[]'), ext: r.ext,
  purpose: r.purpose, alt_ar: r.alt_ar, alt_en: r.alt_en, bytes: r.bytes, created_at: r.created_at,
});
