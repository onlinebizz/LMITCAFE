import { Buffer } from 'node:buffer';

// Adapt only the request/response surface used by the original route modules.
// Body reads remain streaming so the existing upload size limits still apply.
export function requestBridge(request) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers);
  headers.host = url.host;
  headers['x-forwarded-proto'] = url.protocol.slice(0, -1);
  headers['x-forwarded-for'] = request.headers.get('cf-connecting-ip') || 'local';
  // Cloudflare handles wire compression; avoid doing CPU-heavy compression twice.
  delete headers['accept-encoding'];
  return {
    method: request.method,
    url: url.pathname + url.search,
    headers,
    socket: { encrypted: url.protocol === 'https:', remoteAddress: headers['x-forwarded-for'] },
    on(event, fn) {
      if (event === 'close') request.signal.addEventListener('abort', fn, { once: true });
    },
    async *[Symbol.asyncIterator]() {
      if (!request.body) return;
      const reader = request.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          yield Buffer.from(value);
        }
      } finally { reader.releaseLock(); }
    },
  };
}

export function responseBridge(request, initialHeaders = {}) {
  const headers = new Headers(initialHeaders);
  let status = 200;
  let sent = false;
  let ended = false;
  let controller;
  const body = new ReadableStream({
    start(c) { controller = c; },
    cancel() { ended = true; },
  });
  return {
    get headersSent() { return sent; },
    get writableEnded() { return ended; },
    setHeader(name, value) { headers.set(name, String(value)); },
    getHeader(name) { return headers.get(name); },
    writeHead(code, values = {}) {
      status = code;
      for (const [name, value] of Object.entries(values)) headers.set(name, String(value));
      sent = true;
    },
    write(value) {
      if (ended || request.signal.aborted) throw new Error('Response is closed.');
      controller.enqueue(typeof value === 'string' ? new TextEncoder().encode(value) : value);
    },
    end(value) {
      if (ended) return;
      if (value !== undefined) this.write(value);
      ended = true;
      controller.close();
    },
    toResponse() {
      const noBody = request.method === 'HEAD' || [204, 304].includes(status);
      if (noBody && !ended) this.end();
      return new Response(noBody ? null : body, { status, headers });
    },
  };
}
