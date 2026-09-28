/**
 * Live-path check runner — bundles src/engine/live-checks.ts with esbuild
 * (same pattern as scripts/run-replay.mjs) and runs it with node.
 *
 * Usage: node scripts/run-live-checks.mjs
 */
import { build } from 'esbuild';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const entry = resolve(root, 'src/engine/live-checks.ts');

const tmpDir = mkdtempSync(join(tmpdir(), 'wp-live-'));
const outfile = resolve(tmpDir, 'live-checks.mjs');

const result = await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile,
  write: false,
  logLevel: 'warning',
});

writeFileSync(outfile, result.outputFiles[0].text);

try {
  const res = spawnSync('node', [outfile], { stdio: 'inherit', cwd: root });
  process.exit(res.status ?? 0);
} finally {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
