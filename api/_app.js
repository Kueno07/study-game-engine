// Shared setup for the routes. Files starting with an underscore are not routes on Vercel.
import { storeFromEnv } from '../src/store.js';
import { createAuth } from '../src/auth.js';

export const store = storeFromEnv(process.env, { prefix: 'demo' });
const authorize = createAuth({ store });

// Answers 401/400 itself and returns false when the request may not continue.
export async function guard(req, res) {
  try {
    const v = await authorize(req.headers['x-app-token'], { claim: req.headers['x-app-claim'] === '1' });
    if (!v.ok) res.status(v.status).json({ error: v.error });
    return v.ok;
  } catch (e) {
    fail(res, e);
    return false;
  }
}

export const fail = (res, e) => res.status(500).json({ error: String((e && e.message) || e) });

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}
