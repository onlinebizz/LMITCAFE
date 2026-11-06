import crypto from 'node:crypto';
import { one, run, all } from './db.js';
import { HttpError, parseCookies, clientIp, isSecure } from './http.js';
import { SESSION_DAYS, FORCE_SECURE_COOKIES } from './config.js';

const COOKIE = 'lmit_sid';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------- passwords (scrypt, per-user salt) ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}
const DUMMY = hashPassword(crypto.randomBytes(8).toString('hex'));
export function verifyPassword(pw, stored) {
  const [kind, saltB64, hashB64] = String(stored).split('$');
  if (kind !== 'scrypt') return false;
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const got = crypto.scryptSync(pw, salt, expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(got, expected);
}
export function checkPasswordPolicy(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw new HttpError(400, 'weak_password', 'Password must be at least 10 characters.', { field: 'password' });
  if (pw.length > 200) throw new HttpError(400, 'too_long', 'Password is too long.', { field: 'password' });
}

// ---------- rate limiting (in memory, per process) ----------
const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.n += 1;
  if (b.n > max) {
    const wait = Math.ceil((b.reset - now) / 1000);
    throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again later.', { retry_after: wait });
  }
}
export function rateReset(key) { buckets.delete(key); }
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 60_000).unref();

// ---------- sessions ----------
export function createSession(res, req, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  const expires = now + SESSION_DAYS * 86400_000;
  run('INSERT INTO sessions(token_hash,user_id,csrf,created_at,expires_at) VALUES(?,?,?,?,?)', sha(token), userId, csrf, now, expires);
  setCookie(res, req, token, SESSION_DAYS * 86400);
  return csrf;
}
function setCookie(res, req, value, maxAge) {
  const secure = FORCE_SECURE_COOKIES || isSecure(req) ? '; Secure' : '';
  const prev = res.getHeader('Set-Cookie');
  const c = `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}
export function destroySession(req, res) {
  const t = parseCookies(req)[COOKIE];
  if (t) run('DELETE FROM sessions WHERE token_hash=?', sha(t));
  setCookie(res, req, '', 0);
}
export function destroyOtherSessions(req, userId) {
  const t = parseCookies(req)[COOKIE];
  run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', userId, t ? sha(t) : '');
}

export function currentUser(req) {
  const t = parseCookies(req)[COOKIE];
  if (!t) return null;
  const row = one(
    `SELECT s.token_hash, s.csrf, s.expires_at, u.id, u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`,
    sha(t)
  );
  if (!row) return null;
  if (row.expires_at < Date.now()) { run('DELETE FROM sessions WHERE token_hash=?', row.token_hash); return null; }
  return { id: row.id, email: row.email, csrf: row.csrf };
}

// Server side gate for every admin route. Mutating calls also need the CSRF header and a same-origin Origin.
export function requireAdmin(req) {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, 'unauthorized', 'Sign in to continue.');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    sameOrigin(req);
    const sent = String(req.headers['x-csrf-token'] || '');
    const a = Buffer.from(sent);
    const b = Buffer.from(user.csrf);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new HttpError(403, 'csrf', 'Session check failed. Reload the page and try again.');
  }
  return user;
}
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  let host;
  try { host = new URL(origin).host; } catch { throw new HttpError(403, 'forbidden', 'Request origin is not allowed.'); }
  if (host !== req.headers.host) throw new HttpError(403, 'forbidden', 'Request origin is not allowed.');
}

export function login(req, res, email, password) {
  const ip = clientIp(req);
  const key = String(email).toLowerCase();
  rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
  rateLimit(`login-user:${key}`, 6, 15 * 60_000);
  const user = one('SELECT id,email,pass FROM users WHERE email=?', key);
  const ok = verifyPassword(password, user ? user.pass : DUMMY);
  if (!user || !ok) throw new HttpError(401, 'bad_credentials', 'Email or password is not correct.');
  rateReset(`login-user:${key}`);
  const csrf = createSession(res, req, user.id);
  return { user: { id: user.id, email: user.email }, csrf };
}

export function pruneSessions() { run('DELETE FROM sessions WHERE expires_at < ?', Date.now()); }
export function listUsers() { return all('SELECT id,email,created_at FROM users ORDER BY id'); }
