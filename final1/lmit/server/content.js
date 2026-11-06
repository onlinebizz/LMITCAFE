import { bumpVersion, getVersion } from './db.js';
import { broadcast } from './events.js';

// Call after any change the public site can see. Bumps the version (cache key) and tells open pages.
export function commit(scope = 'content') {
  const v = bumpVersion();
  broadcast(scope, v);
  return v;
}
export { getVersion };
