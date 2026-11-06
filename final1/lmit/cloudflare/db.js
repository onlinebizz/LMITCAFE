import { current } from './context.js';

export const one = (sql, ...params) => current().storage.sql.exec(sql, ...params).toArray()[0];
export const all = (sql, ...params) => current().storage.sql.exec(sql, ...params).toArray();
export function run(sql, ...params) {
  const cursor = current().storage.sql.exec(sql, ...params);
  cursor.toArray();
  return {
    changes: one('SELECT changes() AS n').n,
    lastInsertRowid: one('SELECT last_insert_rowid() AS id').id,
  };
}
export const tx = (fn) => current().storage.transactionSync(fn);

export function getVersion() {
  return Number(one("SELECT value FROM meta WHERE key='version'")?.value || 1);
}
export function bumpVersion() {
  const version = getVersion() + 1;
  run("INSERT INTO meta(key,value) VALUES('version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", String(version));
  return version;
}
export function getSetting(key, fallback = null) {
  const row = one('SELECT value FROM settings WHERE key=?', key);
  try { return row ? JSON.parse(row.value) : fallback; } catch { return fallback; }
}
export function setSetting(key, value) {
  run('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, JSON.stringify(value));
}
export function allSettings() {
  return Object.fromEntries(all('SELECT key,value FROM settings').flatMap((row) => {
    try { return [[row.key, JSON.parse(row.value)]]; } catch { return []; }
  }));
}
export const toHalalas = (sar) => Math.round(Number(sar) * 100);
export const toSar = (halalas) => Math.round(halalas) / 100;
