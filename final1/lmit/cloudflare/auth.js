import crypto from 'node:crypto';
import { one, run, all, tx } from './db.js';
import { current } from './context.js';
import { HttpError, parseCookies, clientIp, isSecure } from '../.cloudflare/server/http.js';

const COOKIE = 'lmit_sid';
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ITERATIONS = 100000;
const same = (a, b) => {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

export function checkPasswordPolicy(password) {
  if (typeof password !== 'string' || password.length < 10) throw new HttpError(400, 'weak_password', 'Password must be at least 10 characters.', { field: 'password' });
  if (password.length > 200) throw new HttpError(400, 'too_long', 'Password is too long.', { field: 'password' });
}
async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', Buffer.from(password), 'PBKDF2', false, ['deriveBits']);
  return Buffer.from(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256));
}
export async function hashPassword(password) {
  checkPasswordPolicy(password);
  const salt = crypto.randomBytes(16);
  const hash = await derive(password, salt);
  return `pbkdf2$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export async function verifyPassword(password, stored) {
  const [kind, salt, expected] = String(stored).split('$');
  if (kind !== 'pbkdf2') return false;
  const actual = await derive(password, Buffer.from(salt, 'base64'));
  const wanted = Buffer.from(expected, 'base64');
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}

export function basicCredentials(req) {
  const header = req.headers.authorization || '';
  if (!/^Basic /i.test(header) || header.length > 1500) throw new HttpError(401, 'unauthorized', 'Valid owner credentials are required.');
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 1) throw new HttpError(401, 'unauthorized', 'Valid owner credentials are required.');
  const email = decoded.slice(0, separator).trim().toLowerCase();
  const password = decoded.slice(separator + 1);
  if (!/^[^\s:\x00-\x1f\x7f]{1,120}$/.test(email)) throw new HttpError(400, 'invalid', 'Use a username or email without spaces.');
  return { email, password };
}
export async function bootstrapOwner(req) {
  sameOrigin(req);
  if (one('SELECT id FROM users LIMIT 1')) throw new HttpError(409, 'already_setup', 'An owner already exists. Sign in instead.');
  const expected = current().env.ADMIN_SETUP_KEY;
  if (!expected || expected.length < 32 || !same(sha(req.headers['x-setup-key'] || ''), sha(expected))) throw new HttpError(403, 'forbidden', 'Owner setup is not authorized.');
  // Only an authorized one-time setup can spend KDF work or consume this limit.
  rateLimit(`setup:${sha(expected)}:${clientIp(req)}`, 5, 15 * 60000);
  const { email, password } = basicCredentials(req);
  const hash = await hashPassword(password);
  tx(() => {
    if (one('SELECT id FROM users LIMIT 1')) throw new HttpError(409, 'already_setup', 'An owner already exists.');
    run('INSERT INTO users(email,pass) VALUES(?,?)', email, hash);
  });
  return { ok: true, user: { email } };
}

// Persist rate limits so eviction and isolate restarts cannot reset a login lockout.
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const row = one('SELECT n,reset FROM rate_limits WHERE key=?', key);
  const reset = row && row.reset > now ? row.reset : now + windowMs;
  const n = row && row.reset > now ? row.n + 1 : 1;
  run('INSERT INTO rate_limits(key,n,reset) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET n=excluded.n,reset=excluded.reset', key, n, reset);
  if (n > max) throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again later.', { retry_after: Math.max(1, Math.ceil((reset - now) / 1000)) });
}
export function rateReset(key) { run('DELETE FROM rate_limits WHERE key=?', key); }
function setCookie(res, req, token, maxAge) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isSecure(req) ? '; Secure' : ''}`);
}
export function createSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  run('INSERT INTO sessions(token_hash,user_id,csrf,created_at,expires_at) VALUES(?,?,?,?,?)', sha(token), userId, csrf, now, now + 14 * 86400000);
  setCookie(res, req, token, 14 * 86400);
  return csrf;
}
export function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const row = one('SELECT s.token_hash,s.csrf,s.expires_at,u.id,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?', sha(token));
  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.id, email: row.email, csrf: row.csrf };
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (origin && origin !== `${isSecure(req) ? 'https' : 'http'}://${req.headers.host}`) throw new HttpError(403, 'forbidden', 'Request origin is not allowed.');
}
export function requireAdmin(req) {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, 'unauthorized', 'Sign in to continue.');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    sameOrigin(req);
    if (!same(req.headers['x-csrf-token'] || '', user.csrf)) throw new HttpError(403, 'csrf', 'Session check failed. Reload the page and try again.');
  }
  return user;
}
export function destroySession(req, res) {
  const token = parseCookies(req)[COOKIE];
  if (token) run('DELETE FROM sessions WHERE token_hash=?', sha(token));
  setCookie(res, req, '', 0);
}
export function destroyOtherSessions(req, userId) {
  const token = parseCookies(req)[COOKIE];
  run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', userId, token ? sha(token) : '');
}
export async function login(req, res, email, password) {
  const normalized = email.trim().toLowerCase();
  rateLimit(`login-ip:${clientIp(req)}`, 20, 15 * 60000);
  rateLimit(`login-user:${normalized}`, 6, 15 * 60000);
  if (!one('SELECT id FROM users LIMIT 1')) {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = current().env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new HttpError(503, 'admin_setup_required', 'Configure ADMIN_EMAIL and ADMIN_PASSWORD as Cloudflare secrets first.');
    if (same(normalized, ADMIN_EMAIL.trim().toLowerCase()) && same(sha(password), sha(ADMIN_PASSWORD))) {
      const hash = await hashPassword(password);
      tx(() => {
        if (!one('SELECT id FROM users LIMIT 1')) run('INSERT INTO users(email,pass) VALUES(?,?)', normalized, hash);
      });
    }
  }
  const user = one('SELECT id,email,pass FROM users WHERE email=?', normalized);
  // Spend the same KDF work on unknown accounts as on known accounts.
  const dummy = `pbkdf2$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(32).toString('base64')}`;
  const ok = await verifyPassword(password, user?.pass || dummy);
  if (!user || !ok) throw new HttpError(401, 'bad_credentials', 'Email or password is not correct.');
  rateReset(`login-user:${normalized}`);
  return { user: { id: user.id, email: user.email }, csrf: createSession(res, req, user.id) };
}
export function pruneSessions() {
  run('DELETE FROM sessions WHERE expires_at<?', Date.now());
  run('DELETE FROM rate_limits WHERE reset<?', Date.now());
}
export const listUsers = () => all('SELECT id,email,created_at FROM users ORDER BY id');
