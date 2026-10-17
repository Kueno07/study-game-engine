// In-memory stand-in for the Upstash REST API: the commands the engine uses (GET, SET with NX and EX, DEL, EXISTS, DBSIZE).
// fetch is what store.js calls, so tests and the local server run without a network or a real database.
export function createFakeRedis(seed = {}) {
  const db = new Map(Object.entries(seed));
  const calls = [];
  async function fetch(_url, opts) {
    const [c, k, ...a] = JSON.parse(opts.body);
    calls.push([c, k, ...a]);
    let result = null;
    if (c === 'GET') result = db.get(k) ?? null;
    else if (c === 'SET') { if (!(a.includes('NX') && db.has(k))) { db.set(k, a[0]); result = 'OK'; } }
    else if (c === 'DEL') { result = db.delete(k) ? 1 : 0; }
    else if (c === 'EXISTS') result = db.has(k) ? 1 : 0;
    else if (c === 'DBSIZE') result = db.size;
    else return { json: async () => ({ error: `ERR unknown command ${c}` }) };
    return { json: async () => ({ result }) };
  }
  return { db, calls, fetch, writes: () => calls.filter(([c]) => c === 'SET' || c === 'DEL').length };
}
