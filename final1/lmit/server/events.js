// Server-sent events: tells open pages that content changed so they refetch. No data travels here.
const clients = new Set();
const MAX_CLIENTS = 1000;

export function subscribe(req, res, currentVersion) {
  if (clients.size >= MAX_CLIENTS) { res.writeHead(503); res.end(); return; }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 3000\nevent: hello\ndata: ${JSON.stringify({ v: currentVersion })}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
}

export function broadcast(scope, version) {
  const msg = `event: change\ndata: ${JSON.stringify({ scope, v: version })}\n\n`;
  for (const c of clients) { try { c.write(msg); } catch { clients.delete(c); } }
}

setInterval(() => { for (const c of clients) { try { c.write(': ping\n\n'); } catch { clients.delete(c); } } }, 25_000).unref();
export const clientCount = () => clients.size;
