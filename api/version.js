// The deployed commit and environment. A client can compare it with the one it booted on and reload,
// and a DEV strip can show when env is not 'production' ('local' when VERCEL_ENV is unset).
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ v: process.env.VERCEL_GIT_COMMIT_SHA || 'dev', env: process.env.VERCEL_ENV || 'local' });
}
