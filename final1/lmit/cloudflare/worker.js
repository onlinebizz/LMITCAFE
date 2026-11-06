import { DurableObject } from 'cloudflare:workers';
import { requestContext } from './context.js';
import { requestBridge, responseBridge } from './bridge.js';
import { all, one } from './db.js';
import { pruneSessions } from './auth.js';
import { HttpError, json, send } from '../.cloudflare/server/http.js';
import * as admin from '../.cloudflare/server/api-admin.js';
import * as publicApi from '../.cloudflare/server/api-public.js';
import * as pages from '../.cloudflare/server/pages.js';
import schema from '../.cloudflare/schema.js';
import seed from '../.cloudflare/seed.json';

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'", "script-src 'self'", "style-src 'self'", "img-src 'self' data:",
    "font-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'self'",
    "form-action 'self'", "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
};
const routes = [];
function add(method, pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, key) => { keys.push(key); return '([^/]+)'; }) + '/?$');
  routes.push({ method, re, keys, handler });
}
admin.register(add);
publicApi.register(add);
pages.register(add);

export class Cafe extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.state = { storage: ctx.storage, env, clients: new Set() };
    ctx.blockConcurrencyWhile(async () => {
      requestContext.run(this.state, () => {
        ctx.storage.transactionSync(() => {
          ctx.storage.sql.exec(schema);
          ctx.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS media_chunks (
              media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
              part INTEGER NOT NULL,
              data BLOB NOT NULL,
              PRIMARY KEY(media_id,part)
            );
            CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY,n INTEGER NOT NULL,reset INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS rate_limits_reset ON rate_limits(reset);
          `);
          if (!one("SELECT value FROM meta WHERE key='seeded'")) {
            for (const [table, rows] of Object.entries(seed)) for (const row of rows) {
              const columns = Object.keys(row);
              ctx.storage.sql.exec(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')})`, ...Object.values(row));
            }
          }
          pruneSessions();
        });
      });
    });
  }
  fetch(request) {
    return requestContext.run(this.state, () => this.handle(request));
  }
  async handle(request) {
    const url = new URL(request.url);
    const req = requestBridge(request);
    const headers = { ...SECURITY_HEADERS };
    if (url.protocol === 'https:') headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    const res = responseBridge(request, headers);
    try {
      if (!['GET', 'POST', 'PUT', 'DELETE', 'HEAD'].includes(request.method)) throw new HttpError(405, 'method', 'Method not allowed.');
      // This remains closed even if an old backup contains enabled orders.
      if (url.pathname === '/api/orders' && request.method === 'POST') throw new HttpError(403, 'orders_closed', 'Online orders are not open right now.');
      if (url.pathname.startsWith('/media/')) return await this.media(request, res);
      const method = request.method === 'HEAD' ? 'GET' : request.method;
      for (const route of routes) {
        if (route.method !== method) continue;
        const match = route.re.exec(url.pathname);
        if (!match) continue;
        const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
        const out = await route.handler({ req, res, params, query: url.searchParams, url, user: null });
        if (out !== undefined && !res.headersSent) json(req, res, 200, out);
        else if (!res.headersSent && !res.writableEnded) send(res, 204, '');
        return res.toResponse();
      }
      pages.notFound(req, res);
    } catch (error) {
      if (res.headersSent) { res.end(); return res.toResponse(); }
      if (error instanceof HttpError) {
        json(req, res, error.status, { error: { code: error.code, message: error.message, ...error.extra } },
          error.extra?.retry_after ? { 'Retry-After': String(error.extra.retry_after) } : {});
      } else if (error instanceof URIError) {
        json(req, res, 400, { error: { code: 'invalid', message: 'Invalid request URL or cookie.' } });
      } else {
        console.error('Request failed', request.method, url.pathname, error);
        json(req, res, 500, { error: { code: 'server_error', message: 'Something went wrong on our side. Try again.' } });
      }
    }
    return res.toResponse();
  }
  async media(request, res) {
    if (!['GET', 'HEAD'].includes(request.method)) throw new HttpError(405, 'method', 'Method not allowed.');
    const match = /^\/media\/([a-f0-9]{16})-(\d{2,4}|orig)\.(webp|jpg|png)$/.exec(new URL(request.url).pathname);
    const media = match && one('SELECT * FROM media WHERE key=?', match[1]);
    if (!media) throw new HttpError(404, 'not_found', 'Image not found.');
    const chunks = all('SELECT data FROM media_chunks WHERE media_id=? ORDER BY part', media.id);
    if (!chunks.length) {
      const asset = await this.env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
      return new Response(asset.body, { status: asset.status, headers });
    }
    if (match[2] !== 'orig' || match[3] !== media.ext) throw new HttpError(404, 'not_found', 'Image not found.');
    const etag = `"${media.key}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (request.headers.get('if-none-match') === etag) { res.writeHead(304); res.end(); }
    else {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': media.bytes });
      if (request.method !== 'HEAD') for (const chunk of chunks) res.write(new Uint8Array(chunk.data));
      res.end();
    }
    return res.toResponse();
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      const assetUrl = new URL('/admin/index.html', url);
      const response = await env.ASSETS.fetch(new Request(assetUrl, request));
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
      headers.set('X-Robots-Tag', 'noindex, nofollow');
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, { status: response.status, headers });
    }
    return env.CAFE.getByName('lmit-primary').fetch(request);
  },
};
