// src/store.js refuses a database whose env label does not match the deployment, and never writes outside production.
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';
import { createFakeRedis } from './fake-redis.mjs';

function run(vercelEnv, label) {
  const fake = createFakeRedis(label ? { 'app:env': label } : {});
  const store = createStore({ url: 'http://fake', token: 'x', vercelEnv: () => vercelEnv, fetchImpl: fake.fetch });
  return { fake, ask: () => store.cmd('GET', 'app:anything').then(() => ({ ok: true }), e => ({ ok: false, msg: e.message })) };
}

let c = run('production', null);
assert.ok((await c.ask()).ok, 'production stamps an unlabelled database');
assert.equal(c.fake.db.get('app:env'), 'prod');

assert.ok((await run('production', 'prod').ask()).ok, 'production on a prod database');

let r = await run('production', 'dev').ask();
assert.ok(!r.ok && /labelled "dev"/.test(r.msg), 'production refuses a dev database');

c = run('preview', 'prod');
r = await c.ask();
assert.ok(!r.ok && /labelled "prod"/.test(r.msg), 'preview refuses the prod database');
assert.equal(c.fake.writes(), 0, 'preview never writes to a prod database');

c = run('preview', null);
r = await c.ask();
assert.ok(!r.ok && /unlabelled/.test(r.msg), 'preview refuses an unlabelled database');
assert.equal(c.fake.writes(), 0, 'preview never stamps an unlabelled database');

assert.ok((await run('preview', 'dev').ask()).ok, 'preview on a dev database');
assert.ok((await run(undefined, 'dev').ask()).ok, 'a local run (no VERCEL_ENV) counts as dev');
assert.ok(!(await run(undefined, null).ask()).ok, 'a local run refuses an unlabelled database');

// The check runs once per store, not once per command.
c = run('preview', 'dev');
const store = createStore({ url: 'http://fake', token: 'x', vercelEnv: () => 'preview', fetchImpl: c.fake.fetch });
await store.cmd('GET', 'a'); await store.cmd('GET', 'b');
assert.equal(c.fake.calls.filter(([cmd, k]) => cmd === 'GET' && k === 'app:env').length, 1, 'the label is read once');

r = await createStore({ vercelEnv: () => 'preview' }).cmd('GET', 'x').then(() => null, e => e.message);
assert.match(r, /not configured/, 'missing configuration is an error, never a silent fallback');

console.log('store: ok');
