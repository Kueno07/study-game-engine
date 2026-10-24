// The app state as one JSON document: GET reads it, PUT replaces it.
import { store, guard, body, fail } from './_app.js';

export default async function handler(req, res) {
  if (!(await guard(req, res))) return;
  const key = store.key('state');
  try {
    if (req.method === 'GET') {
      const raw = await store.cmd('GET', key);
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ state: raw ? JSON.parse(raw) : null });
    }
    if (req.method === 'PUT') {
      const b = await body(req);
      if (!b || typeof b !== 'object' || Array.isArray(b)
        || !b.state || typeof b.state !== 'object' || Array.isArray(b.state)) {
        return res.status(400).json({ error: 'invalid_state' });
      }
      const state = { ...b.state, saved_at: new Date().toISOString() };
      await store.cmd('SET', key, JSON.stringify(state));
      return res.json({ ok: true, saved_at: state.saved_at });
    }
    res.status(405).end();
  } catch (e) {
    if (e instanceof Error && Number.isInteger(e.status) && e.status >= 400 && e.status < 500) {
      return res.status(e.status).json({ error: e.code || 'invalid_request' });
    }
    fail(res, e);
  }
}
