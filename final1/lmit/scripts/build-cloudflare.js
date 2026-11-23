// Build tools run in Cloudflare's Node environment, never inside a Worker.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFarfalliSeed } from '../cloudflare/seed/farfalli-seed.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.cloudflare');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'server'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(output, 'public'), { recursive: true });

// Only Farfalli's approved seed photos and catalog are made public by this build.
const seed = buildFarfalliSeed(path.join(output, 'public', 'media'));
fs.writeFileSync(path.join(output, 'seed.json'), JSON.stringify(seed));
const brand = path.join(output, 'public', 'brand');
for (const name of fs.readdirSync(brand)) if (!['farfalli.svg', 'saudi-riyal.svg'].includes(name)) fs.rmSync(path.join(brand, name));
fs.rmSync(path.join(output, 'public', 'favicon.ico'), { force: true });
fs.copyFileSync(path.join(root, 'cloudflare', 'seed', 'farfalli-media', 'margherita.webp'), path.join(brand, 'farfalli-social.webp'));

// Keep one implementation of routes, validation and views. Only storage,
// password hashing, image processing and the HTTP boundary differ on Workers.
const adapted = new Set(['db', 'config', 'images', 'auth', 'events']);
for (const name of ['api-admin', 'api-public', 'model', 'settings', 'content', 'http', 'multipart', 'pages']) {
  let source = fs.readFileSync(path.join(root, 'server', `${name}.js`), 'utf8');
  source = source.replace(/from '\.\/([a-z-]+)\.js'/g, (match, module) =>
    adapted.has(module) ? `from '../../cloudflare/${module}.js'` : match);
  if (name === 'api-admin') {
    source = source.replace("import fs from 'node:fs';\n", '');
    source = source.replace('!verifyPassword(cur, row.pass)', '!(await verifyPassword(cur, row.pass))');
    source = source.replace('hashPassword(next)', 'await hashPassword(next)');
  }
  fs.writeFileSync(path.join(output, 'server', `${name}.js`), source);
}
const originalDb = fs.readFileSync(path.join(root, 'server', 'db.js'), 'utf8');
const schema = originalDb.match(/db\.exec\(`([\s\S]*?)`\);/)?.[1];
if (!schema) throw new Error('Could not locate the original database schema.');
fs.writeFileSync(path.join(output, 'schema.js'), `export default ${JSON.stringify(schema.replace(/^PRAGMA .*;\s*$/gm, ''))};\n`);
console.log('Built Workers routes, Farfalli menu seed and optimized static assets.');
