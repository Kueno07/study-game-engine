# study-game-engine

Backend pieces I wrote for a personal study game that runs on Vercel and Upstash Redis. They are small, have no
dependencies, and each one has tests. This repo holds only the generic parts. The game and its content are not here.

## What is in it

| Piece | File | What it does |
|---|---|---|
| Store with an environment guard | `src/store.js` | Upstash REST client. The database carries a `prod` or `dev` label, and a deployment refuses to run against the wrong one. |
| Phrase auth | `src/auth.js` | One user, no accounts. `APP_TOKEN` is the phrase, or the first login claims the app and only the SHA-256 is stored. |
| Review scheduler | `src/srs.js` | Spaced-review boxes as pure functions: schedule, practice before the due date, two directions, queue order. |
| Example routes | `api/` | `state` (GET and PUT one JSON document) and `version` (commit and environment). |
| Local server | `dev/server.mjs` | The real routes over an in-memory fake Redis. Nothing leaves the machine. |
| Test runner and CI | `dev/run-tests.mjs`, `.github/workflows/ci.yml` | `npm test` runs every `dev/test-*.mjs`. CI runs the same command. |

## Run it

Node 20 or newer. There is nothing to install.

```bash
npm test      # 4 test files
npm run dev   # http://127.0.0.1:8787, phrase "local-dev-phrase" in the x-app-token header
```

## The DEV and PROD guard

A Vercel preview deployment shares the project's environment variables. If the Redis variables are set for every
environment, a preview writes to the production database. This repo does not rely on getting the variables right.

1. The database stores a label under `<prefix>:env`.
2. Production stamps an unlabelled database `prod` on its first request, and refuses a database labelled `dev`.
3. Every other deployment only reads, and must find `dev`. An unlabelled database is refused as well, because it
   may be production before its first request.
4. A DEV database gets its label once, from an empty state:
   `KV_REST_API_URL=... KV_REST_API_TOKEN=... node dev/mark-dev-db.mjs`. The script refuses a database that
   already holds data.

Setup on Vercel: create a second Upstash database, set the Redis variables for the Preview environment only, and
run the script above against it. Until then a preview fails with a clear message instead of touching production.
`dev/test-store.mjs` covers these rules, including "a preview never writes to a prod database".

## Tests

The tests were checked by breaking the code on purpose: turning the guard off, letting practice move a box, and
dropping `NX` from the claim each make a test fail. The last one needed a test for two claims at the same moment,
which the first version of the suite did not have.

## License

MIT
