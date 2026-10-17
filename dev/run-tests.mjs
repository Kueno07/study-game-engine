// `npm test`: runs every dev/test-*.mjs in its own process, prints the output of the failed ones, exits 1 on any failure.
// The CI workflow and a local run use the same command. A new test file is picked up by its name.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const checks = readdirSync(dir).filter(f => /^test-.*\.mjs$/.test(f)).sort();

const failed = [];
for (const file of checks) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(dir, file)], { encoding: 'utf8' });
  const ok = r.status === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${file} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (!ok) {
    failed.push(file);
    console.log(`${r.stdout || ''}${r.stderr || ''}${r.error ? r.error.message : ''}`.trimEnd());
  }
}

console.log(failed.length ? `\n${failed.length} of ${checks.length} failed: ${failed.join(', ')}` : `\nall ${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
