// Explicit maintenance command. Requires Node 22 and Python with Pillow.
// Never reads, exports or rewrites an owner's live data directory.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'cloudflare', 'seed');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'lmit-seed-'));
process.env.DATA_DIR = scratch;
try {
  const { seedIfEmpty } = await import('../server/seed.js');
  const { db, all } = await import('../server/db.js');
  await seedIfEmpty();
  const seed = {};
  for (const table of ['media', 'categories', 'products', 'variants', 'extras', 'settings', 'meta']) {
    seed[table] = all(`SELECT * FROM ${table}`);
  }
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, 'content.json'), JSON.stringify(seed, null, 2) + '\n');
  fs.cpSync(path.join(scratch, 'media'), path.join(destination, 'media'), { recursive: true });
  db.close();
  console.log('Refreshed initial menu content and optimized owner photos.');
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
