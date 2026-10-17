// api/state.js and api/version.js through the real handlers, over the fake Redis.
import assert from 'node:assert/strict';
import { createFakeRedis } from './fake-redis.mjs';

const fake = createFakeRedis({ 'demo:env': 'dev' });
globalThis.fetch = fake.fetch;
process.env.KV_REST_API_URL = 'http://fake-redis';
process.env.KV_REST_API_TOKEN = 'x';
process.env.APP_TOKEN = 'test-phrase';
delete process.env.VERCEL_ENV;

const state = (await import('../api/state.js')).default;
const version = (await import('../api/version.js')).default;

async function call(handler, { method = 'GET', token, body } = {}) {
  const out = { status: 200, headers: {}, json: null };
  const res = {
    status(c) { out.status = c; return this; },
    setHeader(k, v) { out.headers[k] = v; },
    json(b) { out.json = b; return this; },
    end() { return this; },
  };
  await handler({ method, headers: token ? { 'x-app-token': token } : {}, body }, res);
  return out;
}

assert.equal((await call(state)).status, 401, 'no token: 401');
assert.equal((await call(state, { token: 'nope' })).status, 401, 'wrong token: 401');
assert.equal(fake.writes(), 0, 'a refused request writes nothing');

let r = await call(state, { token: 'test-phrase' });
assert.deepEqual(r.json, { state: null }, 'empty at first');
assert.equal(r.headers['Cache-Control'], 'no-store');

r = await call(state, { method: 'PUT', token: 'test-phrase', body: { state: { xp: 40 } } });
assert.ok(r.json.ok && r.json.saved_at, 'PUT saves and stamps the time');
assert.equal((await call(state, { method: 'PUT', token: 'test-phrase', body: {} })).status, 400, 'PUT without state: 400');
assert.equal((await call(state, { method: 'DELETE', token: 'test-phrase' })).status, 405, 'other methods: 405');

r = await call(state, { token: 'test-phrase' });
assert.equal(r.json.state.xp, 40, 'GET returns what PUT saved');

r = await call(version);
assert.deepEqual(Object.keys(r.json).sort(), ['env', 'v'], 'version reports the commit and the environment');
assert.equal(r.json.env, 'local');

console.log('api: ok');
