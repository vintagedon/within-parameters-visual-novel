/**
 * Content-extremes runner: bundles scripts/content-extremes.entry.ts with
 * esbuild (same pattern as scripts/run-live-checks.mjs) and runs it with node.
 *
 * Usage:
 *   node scripts/content-extremes.mjs [--data <dir>]
 *
 * --data points the analysis at a scratch copy of the data directory
 * (default: <repo>/data). The gate 5.1 mutation check copies data/ to a
 * scratch tree, lengthens one string, and re-runs to prove the script reads
 * the data rather than a list.
 */
import { build } from 'esbuild';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const entry = resolve(root, 'scripts/content-extremes.entry.ts');

const dataArgIdx = process.argv.indexOf('--data');
const dataDir = dataArgIdx >= 0 ? resolve(process.argv[dataArgIdx + 1]) : resolve(root, 'data');

const tmpDir = mkdtempSync(join(tmpdir(), 'wp-extremes-'));
const outfile = resolve(tmpDir, 'content-extremes.mjs');

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
  const res = spawnSync('node', [outfile, root, dataDir], { stdio: 'inherit', cwd: root });
  process.exit(res.status ?? 0);
} finally {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}
