// Shared setup for the routes. Files starting with an underscore are not routes on Vercel.
import { storeFromEnv } from '../src/store.js';
import { createAuth } from '../src/auth.js';

export const store = storeFromEnv(process.env, { prefix: 'demo' });
const authorize = createAuth({ store });
const MAX_BODY_BYTES = 1024 * 1024;

export class RequestBodyError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

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
  const declaredLength = Number(req.headers?.['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RequestBodyError(413, 'body_too_large');
  }

  if (req.body !== undefined) {
    if (typeof req.body === 'string') return parseBody(req.body);
    if (req.body === null || typeof req.body !== 'object') {
      throw new RequestBodyError(400, 'invalid_json');
    }
    const serialized = JSON.stringify(req.body);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) {
      throw new RequestBodyError(413, 'body_too_large');
    }
    return req.body;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > MAX_BODY_BYTES) throw new RequestBodyError(413, 'body_too_large');
    chunks.push(bytes);
  }

  return parseBody(Buffer.concat(chunks).toString('utf8'));
}

function parseBody(raw) {
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    throw new RequestBodyError(413, 'body_too_large');
  }
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestBodyError(400, 'invalid_json');
  }
}
