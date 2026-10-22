import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('site');
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.pdf': 'application/pdf', '.mp4': 'video/mp4' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (req.method === 'POST' && pathname === '/api/inquiries') {
      const expectedOrigins = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
      if (req.headers.origin && !expectedOrigins.includes(req.headers.origin)) { res.writeHead(403).end(); return; }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 65536) { res.writeHead(413).end(); return; }
      }
      let inquiry;
      try { inquiry = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
      if (!Array.isArray(inquiry.fields) || !inquiry.fields.length || inquiry.fields.some(field => typeof field.label !== 'string' || typeof field.value !== 'string')) { res.writeHead(400).end(); return; }
      const dataDir = path.resolve('data');
      await fs.mkdir(dataDir, { recursive: true });
      await fs.appendFile(path.join(dataDir, 'inquiries.jsonl'), JSON.stringify({ receivedAt: new Date().toISOString(), page: inquiry.page, fields: inquiry.fields }) + '\n');
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ saved: true }));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    let stat = await fs.stat(target);
    if (stat.isDirectory()) target = path.join(target, 'index.html');
    const body = await fs.readFile(target);
    let type = types[path.extname(target)] || 'application/octet-stream';
    if (target.endsWith('.bin')) {
      const head = body.subarray(0, 100).toString();
      if (/^\s*(?:\/\*|@font-face|@charset|@import)/.test(head)) type = 'text/css; charset=utf-8';
      else if (/^\s*(?:!function|\(function|var |const |\/\*!)/.test(head)) type = 'text/javascript; charset=utf-8';
      else if (body[0] === 0xff && body[1] === 0xd8) type = 'image/jpeg';
      else if (head.startsWith('RIFF')) type = 'image/webp';
      else if (head.includes('<svg')) type = 'image/svg+xml';
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><title>Page not found — Bhojanic</title><main style="max-width:700px;margin:15vh auto;font:18px sans-serif"><h1>Page not found</h1><p><a href="/home-page">Return to Bhojanic</a></p></main>');
  }
}).listen(port, '127.0.0.1', () => console.log(`Bhojanic replica: http://localhost:${port}`));
