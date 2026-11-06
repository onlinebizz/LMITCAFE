// Usage: node scripts/create-admin.js owner@example.com "a password of 10 or more characters"
// Run again with an existing email to reset that administrator's password.
import { one, run } from '../server/db.js';
import { hashPassword, checkPasswordPolicy } from '../server/auth.js';

const [emailArg, password] = process.argv.slice(2);
if (!emailArg || !password) {
  console.error('Usage: node scripts/create-admin.js email password');
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error('That email address does not look right.'); process.exit(1); }
try { checkPasswordPolicy(password); } catch (e) { console.error(e.message); process.exit(1); }

const hash = hashPassword(password);
if (one('SELECT id FROM users WHERE email=?', email)) {
  run('UPDATE users SET pass=? WHERE email=?', hash, email);
  run('DELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE email=?)', email);
  console.log(`Password updated for ${email}. All of their sessions were signed out.`);
} else {
  run('INSERT INTO users(email,pass) VALUES(?,?)', email, hash);
  console.log(`Administrator created: ${email}`);
}
