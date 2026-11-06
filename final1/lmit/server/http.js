import zlib from 'node:zlib';

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function send(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.writeHead(status, headers);
  res.end(body);
}

export function json(req, res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers };
  sendCompressed(req, res, status, Buffer.from(body), h);
}

const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml|manifest\+json)|image\/svg)/;

export function sendCompressed(req, res, status, buf, headers) {
  const type = String(headers['Content-Type'] || '');
  const accept = String(req.headers['accept-encoding'] || '');
  headers['Vary'] = headers['Vary'] ? headers['Vary'] + ', Accept-Encoding' : 'Accept-Encoding';
  if (buf.length > 700 && COMPRESSIBLE.test(type)) {
    if (/\bbr\b/.test(accept)) {
      buf = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } });
      headers['Content-Encoding'] = 'br';
    } else if (/\bgzip\b/.test(accept)) {
      buf = zlib.gzipSync(buf);
      headers['Content-Encoding'] = 'gzip';
    }
  }
  headers['Content-Length'] = buf.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : buf);
}

export async function readBody(req, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'too_large', 'Request body is too large.');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req, limit = 1024 * 1024) {
  const buf = await readBody(req, limit);
  if (!buf.length) return {};
  try {
    const v = JSON.parse(buf.toString('utf8'));
    if (v === null || typeof v !== 'object') throw new Error('shape');
    return v;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.socket.remoteAddress || 'unknown';
}

export function isSecure(req) {
  return req.socket.encrypted || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

// ---- tiny validators; every one throws HttpError(400) with the field name ----
const bad = (field, code, message) => new HttpError(400, code, message, { field });

export function vStr(v, field, { max = 200, req = false, def = '' } = {}) {
  if (v === undefined || v === null) {
    if (req) throw bad(field, 'required', `${field} is required.`);
    return def;
  }
  if (typeof v !== 'string') throw bad(field, 'invalid', `${field} must be text.`);
  const s = v.replace(/\u0000/g, '').trim();
  if (req && !s) throw bad(field, 'required', `${field} is required.`);
  if (s.length > max) throw bad(field, 'too_long', `${field} must be at most ${max} characters.`);
  return s;
}
export function vInt(v, field, { min = 0, max = 1e9, req = false, def = 0 } = {}) {
  if (v === undefined || v === null || v === '') {
    if (req) throw bad(field, 'required', `${field} is required.`);
    return def;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || Math.floor(n) !== n || n < min || n > max) throw bad(field, 'invalid', `${field} is not valid.`);
  return n;
}
export function vMoney(v, field, { min = 0, max = 10000, req = false, def = 0 } = {}) {
  if (v === undefined || v === null || v === '') {
    if (req) throw bad(field, 'required', `${field} is required.`);
    return def;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw bad(field, 'invalid', `${field} is not a valid amount.`);
  return Math.round(n * 100);
}
export function vBool(v, def = false) {
  if (v === undefined || v === null) return def ? 1 : 0;
  return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
}
export function vEnum(v, field, list, def) {
  if (v === undefined || v === null || v === '') return def;
  if (!list.includes(v)) throw bad(field, 'invalid', `${field} is not valid.`);
  return v;
}
export function vUrl(v, field, { max = 500 } = {}) {
  const s = vStr(v, field, { max });
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https:\/\/[^\s]+$/i.test(s)) return s;
  if (/^(tel:|mailto:)[^\s]+$/i.test(s)) return s;
  throw bad(field, 'invalid', `${field} must be a web address that starts with https://.`);
}
export const bad400 = bad;

// Browsers always send Origin on cross-site POSTs. If it is present it must match this host.
export function sameOriginOrNone(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  let host;
  try { host = new URL(origin).host; } catch { throw new HttpError(403, 'forbidden', 'Request origin is not allowed.'); }
  if (host !== req.headers.host) throw new HttpError(403, 'forbidden', 'Request origin is not allowed.');
}
