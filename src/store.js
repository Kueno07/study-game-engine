// Upstash Redis over its REST API (no dependency), plus an environment label check.
//
// The database carries a label under `${prefix}:env`, either 'prod' or 'dev'. The first command of a cold start
// checks that the label matches the deployment, so a preview or a local run can never write to the production
// database, whatever the environment variables say.
//
//   production      stamps an unlabelled database 'prod' (SET NX) and refuses a database labelled 'dev'
//   anything else   only reads, and must find 'dev'. An unlabelled database is refused too: it may be
//                   production before its first request. A DEV database is labelled once with dev/mark-dev-db.mjs.

export function createStore({
  url,
  token,
  prefix = 'app',
  vercelEnv = () => process.env.VERCEL_ENV,
  fetchImpl = (...a) => globalThis.fetch(...a),
} = {}) {
  const labelKey = `${prefix}:env`;
  let verified = false;

  async function send(...cmd) {
    if (!url || !token) throw new Error('Redis not configured: set the REST url and token');
    const r = await fetchImpl(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }

  async function verify() {
    const want = vercelEnv() === 'production' ? 'prod' : 'dev';
    if (want === 'prod') await send('SET', labelKey, 'prod', 'NX');
    const got = await send('GET', labelKey);
    if (got !== want) {
      throw new Error(want === 'prod'
        ? `Refusing to run: this is production but the database is labelled "${got}". The REST url points at the wrong database.`
        : `Refusing to run: this is not production and the database is ${got ? `labelled "${got}"` : 'unlabelled'}, not "dev". Point Preview at a DEV database and label it with dev/mark-dev-db.mjs.`);
    }
    verified = true;
  }

  return {
    key: name => `${prefix}:${name}`,
    async cmd(...c) {
      if (!verified) await verify();
      return send(...c);
    },
  };
}

// Vercel's Upstash integration sets KV_REST_API_*; a manual Upstash setup uses UPSTASH_REDIS_REST_*.
export function storeFromEnv(env = process.env, opts = {}) {
  return createStore({
    url: env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL,
    token: env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN,
    ...opts,
  });
}
