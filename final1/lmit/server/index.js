import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PORT, HOST, PUBLIC_DIR } from './config.js';
import { HttpError, json, send, sendCompressed, isSecure } from './http.js';
import { MEDIA_DIR } from './images.js';
import { seedIfEmpty, ensureAdminFromEnv } from './seed.js';
import { pruneSessions } from './auth.js';
import * as publicApi from './api-public.js';
import * as adminApi from './api-admin.js';
import * as pages from './pages.js';

// ---------- routing ----------
const routes = [];
function add(method, pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  routes.push({ method, re, keys, handler });
}
publicApi.register(add);
adminApi.register(add);
pages.register(add);

// ---------- headers ----------
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  "connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

function baseHeaders(req, res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  if (isSecure(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// ---------- static files ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const zcache = new Map();

function serveFile(req, res, file, { immutable = false, maxAge = 0 } = {}) {
  let st;
  try { st = fs.statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const type = TYPES[ext] || 'application/octet-stream';
  const tag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
  const headers = { 'Content-Type': type, ETag: tag };
  headers['Cache-Control'] = immutable ? 'public, max-age=31536000, immutable' : maxAge ? `public, max-age=${maxAge}` : 'no-cache';
  if (req.headers['if-none-match'] === tag) { res.writeHead(304, headers); res.end(); return true; }
  const k = file + tag;
  let buf = zcache.get(k);
  if (!buf) { buf = fs.readFileSync(file); if (buf.length < 512 * 1024) zcache.set(k, buf); }
  sendCompressed(req, res, 200, buf, headers);
  return true;
}

function serveStatic(req, res, pathname) {
  if (pathname === '/admin' || pathname === '/admin/') {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    return serveFile(req, res, path.join(PUBLIC_DIR, 'admin', 'index.html'));
  }
  if (pathname.startsWith('/media/')) {
    const name = pathname.slice(7);
    if (!/^[a-f0-9]{16}-(\d{2,4}|orig)\.(webp|jpg|png)$/.test(name)) return false;
    return serveFile(req, res, path.join(MEDIA_DIR, name), { immutable: true });
  }
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { return false; }
  if (rel.includes('\0')) return false;
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return false;
  if (rel.startsWith('/admin/')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const longLived = /^\/(fonts|brand)\//.test(rel);
  return serveFile(req, res, file, { maxAge: longLived ? 604800 : 0 });
}

// ---------- request handling ----------
const server = http.createServer(async (req, res) => {
  baseHeaders(req, res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const method = req.method === 'HEAD' ? 'GET' : req.method;
  try {
    if (!['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].includes(req.method)) throw new HttpError(405, 'method', 'Method not allowed.');
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(url.pathname);
      if (!m) continue;
      const params = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      const ctx = { req, res, params, query: url.searchParams, url, user: null };
      const out = await r.handler(ctx);
      if (out !== undefined && !res.headersSent) json(req, res, 200, out);
      else if (out === undefined && !res.headersSent && !res.writableEnded) send(res, 204, '');
      return;
    }
    if (method === 'GET' && serveStatic(req, res, url.pathname)) return;
    throw new HttpError(404, 'not_found', 'Not found.');
  } catch (e) {
    handleError(req, res, url, e);
  }
});

function handleError(req, res, url, e) {
  if (res.headersSent) { res.end(); return; }
  const isApi = url.pathname.startsWith('/api/');
  if (e instanceof HttpError) {
    const headers = e.extra && e.extra.retry_after ? { 'Retry-After': String(e.extra.retry_after) } : {};
    if (!isApi && e.status === 404) return pages.notFound(req, res);
    return json(req, res, e.status, { error: { code: e.code, message: e.message, ...e.extra } }, headers);
  }
  console.error('Unhandled error:', req.method, url.pathname, e);
  if (!isApi) return send(res, 500, 'Something went wrong on our side.', { 'Content-Type': 'text/plain; charset=utf-8' });
  return json(req, res, 500, { error: { code: 'server_error', message: 'Something went wrong on our side. Try again.' } });
}

server.requestTimeout = 60_000;
server.headersTimeout = 20_000;
server.keepAliveTimeout = 65_000;

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));

await seedIfEmpty();
ensureAdminFromEnv();
pruneSessions();
setInterval(pruneSessions, 3600_000).unref();

server.listen(PORT, HOST, () => console.log(`LMIT is running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`));

const shutdown = () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
