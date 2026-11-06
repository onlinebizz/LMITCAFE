import { readBody, HttpError } from './http.js';

// Minimal multipart/form-data parser: text fields plus in-memory files, with a hard size cap.
export async function parseMultipart(req, limit) {
  const ct = String(req.headers['content-type'] || '');
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
  if (!/^multipart\/form-data/i.test(ct) || !m) throw new HttpError(415, 'bad_upload', 'Upload must be sent as a form.');
  const boundary = Buffer.from('--' + (m[1] || m[2]));
  const body = await readBody(req, limit + 64 * 1024);
  const fields = {};
  const files = [];
  let pos = body.indexOf(boundary);
  while (pos !== -1) {
    const start = pos + boundary.length;
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break; // closing boundary
    const next = body.indexOf(boundary, start);
    if (next === -1) break;
    // part = CRLF headers CRLFCRLF data CRLF
    const part = body.subarray(start + 2, next - 2);
    const split = part.indexOf('\r\n\r\n');
    if (split !== -1) {
      const head = part.subarray(0, split).toString('utf8');
      const data = part.subarray(split + 4);
      const name = /name="([^"]*)"/i.exec(head)?.[1];
      const filename = /filename="([^"]*)"/i.exec(head)?.[1];
      if (name !== undefined) {
        if (filename !== undefined) files.push({ name, filename, data });
        else fields[name] = data.toString('utf8');
      }
    }
    pos = next;
  }
  return { fields, files };
}
