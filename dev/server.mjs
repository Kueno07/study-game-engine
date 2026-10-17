// Local server: the real handlers from api/ over an in-memory fake Redis. Nothing leaves the machine.
// Usage: node dev/server.mjs   ->  http://localhost:8787, phrase "local-dev-phrase" in the x-app-token header.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createFakeRedis } from './fake-redis.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fake = createFakeRedis({ 'demo:env': 'dev' }); // the label store.js requires outside production
globalThis.fetch = fake.fetch;
process.env.KV_REST_API_URL = 'http://fake-redis';
process.env.KV_REST_API_TOKEN = 'x';
process.env.APP_TOKEN = 'local-dev-phrase';

const handlers = {};
for (const f of fs.readdirSync(path.join(ROOT, 'api')).filter(f => f.endsWith('.js') && !f.startsWith('_'))) {
  handlers[f.slice(0, -3)] = (await import(pathToFileURL(path.join(ROOT, 'api', f)).href)).default;
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const m = /^\/api\/(\w+)$/.exec(u.pathname);
  if (!m || !handlers[m[1]]) { res.writeHead(404); return res.end('404'); }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  req.query = Object.fromEntries(u.searchParams);
  req.body = raw ? JSON.parse(raw) : {};
  const r = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { res.setHeader(k, v); },
    json(b) { res.writeHead(this.statusCode, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); return this; },
    end() { res.writeHead(this.statusCode); res.end(); },
  };
  try { await handlers[m[1]](req, r); } catch (e) { res.writeHead(500); res.end(String(e)); }
}).listen(8787, '127.0.0.1', () => console.log('dev server on http://127.0.0.1:8787'));
