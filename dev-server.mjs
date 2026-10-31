// Local test server: `node dev-server.mjs` then open http://localhost:3000
// Mimics Vercel: serves the static files and runs api/*.js handlers.
// Set OPENAI_API_KEY (and optionally APP_PASSCODE) in your shell first.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

function wrapRes(res) {
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
  res.send = (b) => { res.end(b); return res; };
  return res;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z]/gi, '');
      const mod = await import(pathToFileURL(join(root, 'api', `${name}.js`)).href);
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      req.body = (req.headers['content-type'] || '').includes('json') && raw ? JSON.parse(raw) : raw;
      return await mod.default(req, wrapRes(res));
    }
    let p = normalize(url.pathname === '/' ? '/index.html' : url.pathname);
    if (p.includes('..')) throw new Error('bad path');
    const data = await readFile(join(root, p));
    res.setHeader('Content-Type', types[extname(p)] || 'application/octet-stream');
    res.end(data);
  } catch (e) {
    res.statusCode = e.code === 'ENOENT' || e.code === 'ERR_MODULE_NOT_FOUND' ? 404 : 500;
    res.end(String(e.message || e));
  }
}).listen(port, () => console.log(`Merchant Language Tutor on http://localhost:${port}`));
