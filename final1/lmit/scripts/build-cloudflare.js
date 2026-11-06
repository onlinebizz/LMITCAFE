// Build tools run in Cloudflare's Node environment, never inside a Worker.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '.cloudflare');
fs.mkdirSync(path.join(output, 'server'), { recursive: true });
fs.cpSync(path.join(root, 'public'), path.join(output, 'public'), { recursive: true });

// Seed artifacts are generated from committed owner assets by refresh-cloudflare-seed.js.
// Deployment itself requires neither Python nor local SQLite.
fs.copyFileSync(path.join(root, 'cloudflare', 'seed', 'content.json'), path.join(output, 'seed.json'));
fs.cpSync(path.join(root, 'cloudflare', 'seed', 'media'), path.join(output, 'public', 'media'), { recursive: true });

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
console.log('Built Workers routes, original menu seed and optimized static assets.');
