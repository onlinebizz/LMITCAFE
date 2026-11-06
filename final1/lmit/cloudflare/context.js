import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();
export function current() {
  const value = requestContext.getStore();
  if (!value) throw new Error('Database access outside the cafe request context.');
  return value;
}
