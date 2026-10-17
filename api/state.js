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
      if (!b.state || typeof b.state !== 'object') return res.status(400).json({ error: 'state missing' });
      b.state.saved_at = new Date().toISOString();
      await store.cmd('SET', key, JSON.stringify(b.state));
      return res.json({ ok: true, saved_at: b.state.saved_at });
    }
    res.status(405).end();
  } catch (e) { fail(res, e); }
}
