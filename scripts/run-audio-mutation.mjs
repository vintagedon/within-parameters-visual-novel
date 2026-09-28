/**
 * Audio mutation (A2.2) — prove the focused audio-restore assertion
 * discriminates.
 *
 * Runs the focused browser phase (event-choice) unmutated and requires it to
 * pass; then removes the journey-audio restore from src/main.ts, rebuilds,
 * and requires the SAME phase to fail with the focused `audio:` assertion —
 * while every presentation assertion (layout, HUD, stats, route, SAVE,
 * continuation) still passes. A mutated run that fails anything else instead
 * is not mutation evidence: the restore must be the only thing that broke.
 *
 * The working tree and the production build are restored in all cases.
 *
 * Usage: node scripts/run-audio-mutation.mjs   (requires a clean src/main.ts)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const mainTs = join(root, 'src', 'main.ts');
const python = '/opt/agents/venv/bin/python';

const FIND = 'Audio.playBGM(resumeBgm, false);';
const REPLACE = '// mutation: journey audio restore dropped (A2.2)';

function build() {
  return spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf-8' });
}

function runFocusedPhase() {
  return spawnSync(python, [join(root, 'tests', 'resume_check.py'), '--audio-only'], {
    cwd: root,
    encoding: 'utf-8',
    timeout: 300000,
  });
}

// 1. Unmutated baseline: the focused audio phase passes.
console.log('  [....] unmutated: building and running the focused audio phase');
if (build().status !== 0) {
  console.log('  [BAD ] unmutated build failed');
  process.exit(1);
}
const baseline = runFocusedPhase();
if (baseline.status !== 0 || !/\[PASS\] event-choice/.test(baseline.stdout)) {
  console.log('  [BAD ] unmutated focused audio phase did not pass — baseline invalid');
  console.log(baseline.stdout.split('\n').filter((l) => l.includes('[')).join('\n'));
  process.exit(1);
}

// 2. Mutated: the focused audio assertion is the failure.
const original = readFileSync(mainTs, 'utf-8');
const mutated = original.replace(FIND, REPLACE);
if (mutated === original) {
  console.log('  [BAD ] restore line not found (mutation never applied)');
  process.exit(1);
}

let ok = false;
try {
  writeFileSync(mainTs, mutated);
  if (build().status !== 0) {
    console.log('  [BAD ] mutated build failed');
  } else {
    const res = runFocusedPhase();
    const output = (res.stdout ?? '') + (res.stderr ?? '');
    const audioFailure = /\[FAIL\] event-choice: audio: /.test(output);
    const unrelatedFailure = /\[FAIL\] event-choice: (?!audio: )/.test(output);
    if (res.status !== 0 && audioFailure && !unrelatedFailure) {
      console.log(
        '  [GOOD] A2.2 dropping the journey audio restore: the focused audio assertion failed as required (presentation assertions still pass)'
      );
      ok = true;
    } else {
      console.log(
        `  [BAD ] mutated run status ${res.status}; audioFailure=${audioFailure}, unrelatedFailure=${unrelatedFailure} — not mutation evidence`
      );
      console.log(output.split('\n').filter((l) => l.includes('[')).join('\n'));
    }
  }
} finally {
  writeFileSync(mainTs, original);
  build();
}
process.exit(ok ? 0 : 1);
