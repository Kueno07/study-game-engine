// One-user authentication with a phrase, no accounts.
//
// If APP_TOKEN is set, it is the phrase. If not, the first login claims the app: the server stores only the
// SHA-256 of the phrase, written with SET NX so a second claim can never overwrite the first. Nobody but the
// owner ever sees the phrase. It returns a verdict instead of touching req/res, so any framework can use it.
import { createHash, timingSafeEqual } from 'node:crypto';

export const sha = s => createHash('sha256').update(String(s)).digest('hex');
const same = (a, b) => timingSafeEqual(Buffer.from(sha(a), 'hex'), Buffer.from(sha(b), 'hex'));

export function createAuth({ store, appToken = process.env.APP_TOKEN, minPhrase = 12 }) {
  const denied = { ok: false, status: 401, error: 'unauthorized' };

  // token: the phrase the client sent. claim: true only on the explicit "set my phrase" request.
  return async function authorize(token = '', { claim = false } = {}) {
    token = String(token);
    if (appToken) return same(token, appToken) ? { ok: true } : denied;

    const key = store.key('auth');
    let stored = await store.cmd('GET', key);
    if (!stored && claim) {
      if (token.length < minPhrase) return { ok: false, status: 400, error: `The phrase needs ${minPhrase} characters or more.` };
      await store.cmd('SET', key, sha(token), 'NX');
      stored = await store.cmd('GET', key);
    }
    if (!stored) return { ok: false, status: 401, error: 'unclaimed' };
    return sha(token) === stored ? { ok: true } : denied;
  };
}
