// Label a DEV Redis as 'dev' (key `${prefix}:env`), once. src/store.js refuses to run outside production on any other database.
// Usage, with the DEV database's REST url and token in the environment:
//   KV_REST_API_URL=... KV_REST_API_TOKEN=... node dev/mark-dev-db.mjs [--prefix app] [--force]
// Refuses a database that already holds data, unless --force: an empty database is the only safe one to label.
// Output never prints the url or the token.
const url = process.env.KV_REST_API_URL, token = process.env.KV_REST_API_TOKEN;
if (!url || !token) { console.error('Set KV_REST_API_URL and KV_REST_API_TOKEN to the DEV database.'); process.exit(2); }

const i = process.argv.indexOf('--prefix');
const prefix = i > -1 ? process.argv[i + 1] : 'app';
const key = `${prefix}:env`;

const send = async (...cmd) => {
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
};

const label = await send('GET', key);
if (label === 'dev') { console.log('already labelled dev'); process.exit(0); }
if (label) { console.error(`This database is labelled "${label}", not touching it.`); process.exit(1); }

const size = await send('DBSIZE');
if (size > 0 && !process.argv.includes('--force')) {
  console.error(`This database holds ${size} key(s). It may be the real one. Use an empty DEV database, or --force if you are sure.`);
  process.exit(1);
}
await send('SET', key, 'dev');
console.log('labelled dev');
