// src/auth.js: APP_TOKEN mode and the first-login claim mode.
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';
import { createAuth, sha } from '../src/auth.js';
import { createFakeRedis } from './fake-redis.mjs';

const fresh = () => {
  const fake = createFakeRedis({ 'app:env': 'dev' });
  return { fake, store: createStore({ url: 'http://fake', token: 'x', vercelEnv: () => 'preview', fetchImpl: fake.fetch }) };
};

// APP_TOKEN set: it is the phrase, and the database is never asked.
let { fake, store } = fresh();
let authorize = createAuth({ store, appToken: 'the-env-phrase' });
assert.deepEqual(await authorize('the-env-phrase'), { ok: true });
assert.equal((await authorize('wrong')).status, 401);
assert.equal((await authorize()).status, 401, 'no token is a 401');
assert.equal(fake.calls.length, 0, 'APP_TOKEN mode does not touch the database');

// No APP_TOKEN: the first login claims the app.
({ fake, store } = fresh());
authorize = createAuth({ store, appToken: '' });
assert.equal((await authorize('some phrase here')).error, 'unclaimed', 'nothing claimed yet');
assert.equal((await authorize('short', { claim: true })).status, 400, 'a short phrase is refused');
assert.deepEqual(await authorize('my long secret phrase', { claim: true }), { ok: true }, 'the first claim wins');
assert.equal(fake.db.get('app:auth'), sha('my long secret phrase'), 'only the hash is stored');
assert.ok(!JSON.stringify([...fake.db]).includes('my long secret phrase'), 'the phrase itself is never stored');
assert.deepEqual(await authorize('my long secret phrase'), { ok: true }, 'the phrase opens it afterwards');
assert.equal((await authorize('another long phrase here', { claim: true })).status, 401, 'a second claim cannot take over');
assert.equal(fake.db.get('app:auth'), sha('my long secret phrase'), 'the stored hash did not change');

// Two claims at the same moment: both see "unclaimed", the first write wins and the second one is refused.
({ fake, store } = fresh());
authorize = createAuth({ store, appToken: '' });
const [first, second] = await Promise.all([
  authorize('first claimant phrase', { claim: true }),
  authorize('second claimant phrase', { claim: true }),
]);
assert.ok(first.ok && !second.ok, 'concurrent claims: the first writer keeps the app');
assert.equal(fake.db.get('app:auth'), sha('first claimant phrase'), 'the second write did not overwrite the hash');

console.log('auth: ok');
