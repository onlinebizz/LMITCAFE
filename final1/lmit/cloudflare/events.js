import { current } from './context.js';

export function subscribe(req, res, version) {
  const clients = current().clients;
  if (clients.size >= 200) { res.writeHead(503); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' });
  res.write(`retry: 30000\nevent: hello\ndata: ${JSON.stringify({ v: version })}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
}
export function broadcast(scope, version) {
  for (const response of current().clients) {
    try { response.write(`event: change\ndata: ${JSON.stringify({ scope, v: version })}\n\n`); }
    catch { current().clients.delete(response); }
  }
}
export const clientCount = () => current().clients.size;
