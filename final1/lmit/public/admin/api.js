// Thin fetch wrapper. Cookie session plus X-CSRF-Token on writes. Errors carry the server code, never shown raw.
let csrf = '';
let unauthorizedHandler = () => {};
export const setCsrf = (v) => { csrf = v || ''; };
export const onUnauthorized = (fn) => { unauthorizedHandler = fn; };

export class ApiError extends Error {
  constructor(code, status = 0, extra = {}) {
    super(code);
    this.code = code;
    this.status = status;
    this.extra = extra;
    this.field = extra.field || '';
  }
}

async function request(method, url, body, opts = {}, retried = false) {
  const headers = {};
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
  let res;
  try {
    res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ApiError('offline');
  }
  if (opts.blob && res.ok) return res.blob();
  let data = null;
  try { const text = await res.text(); data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (res.ok) return data;
  const e = (data && data.error) || {};
  const { code, message, ...extra } = e;
  if (res.status === 403 && code === 'csrf' && !retried) {
    try { const me = await request('GET', '/api/admin/me', undefined, { quiet: true }); setCsrf(me.csrf); return request(method, url, body, opts, true); } catch { /* fall through */ }
  }
  if (res.status === 401 && !opts.quiet) unauthorizedHandler();
  throw new ApiError(code || (res.status >= 500 ? 'server_error' : 'unknown'), res.status, extra);
}

export const api = {
  get: (url, opts) => request('GET', url, undefined, opts),
  post: (url, body, opts) => request('POST', url, body ?? {}, opts),
  put: (url, body, opts) => request('PUT', url, body ?? {}, opts),
  del: (url, opts) => request('DELETE', url, undefined, opts),
  blob: (url) => request('GET', url, undefined, { blob: true }),
};
