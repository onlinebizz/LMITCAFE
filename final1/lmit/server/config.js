import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
export const PORT = Number(process.env.PORT || 3000);
export const HOST = process.env.HOST || '0.0.0.0';
export const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
export const FORCE_SECURE_COOKIES = process.env.COOKIE_SECURE === '1';
export const SESSION_DAYS = 14;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const TIMEZONE = 'Asia/Riyadh';
