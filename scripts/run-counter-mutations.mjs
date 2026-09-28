/**
 * Counter mutations (A1.5, A2.4) — prove the dialogue counter discriminates.
 *
 * Copies tests/complete_run.py to a temporary mutated variant inside tests/,
 * runs it with --trace-check (one natural seed-555555 run against the
 * production build), and asserts the named equality assertion FAILS under
 * each mutation:
 *   1. drop ordinary dialogue counting (the .typing observer never arms);
 *   2. drop epilogue counting (the ending epilogue is never added);
 *   3. drop the epilogue's contribution to the instant AGGREGATE while the
 *      breakdown entry stays — the review's aggregate mutation: the
 *      category references remain intact, only the aggregate assertion
 *      fails. The aggregate drives the duration estimate (A2.4).
 * An unmutated control must pass both counter checks without being accepted
 * as a mutation failure, even when unrelated inventory checks fail.
 * A mutation the trace check survives would mean the counter cannot detect
 * the corresponding under-count.
 *
 * Usage: node scripts/run-counter-mutations.mjs   (requires npm run build)
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const MUTATIONS = [
  {
    name: 'A1.5 drops ordinary dialogue counting (observer never arms)',
    find: "if (node.classList.contains('typing')) { armed = true; return; }",
    replace: "if (false) { armed = true; return; }",
    expect: /^\s*\[FAIL\] counter matches the reconciled independent trace \(seed 555555\)$/m,
  },
  {
    name: 'A1.5 drops epilogue counting at the ending',
    find: 'result.instant_breakdown["epilogue"] = len(epilogue)',
    replace: 'pass',
    expect: /^\s*\[FAIL\] counter matches the reconciled independent trace \(seed 555555\)$/m,
  },
  {
    name: 'A2.4 drops the epilogue from the instant aggregate (duration input)',
    find: 'result.instant_chars += len(epilogue) + len(breakdown)',
    replace: 'result.instant_chars += len(breakdown)',
    expect: /^\s*\[FAIL\] instant aggregate equals its category breakdown for every run$/m,
  },
];

const python = '/opt/agents/venv/bin/python';
function failedExpectedCheck(res, expected) {
  const output = (res.stdout ?? '') + (res.stderr ?? '');
  return res.status === 1 && expected.test(output);
}

// The single-run trace control can exit nonzero on full-inventory checks.
// Passing counter assertions must never count as a rejected mutation.
const control = spawnSync(python, [join(root, 'tests', 'complete_run.py'), '--trace-check'], {
  cwd: root,
  encoding: 'utf-8',
  timeout: 300000,
});
const controlOutput = (control.stdout ?? '') + (control.stderr ?? '');
const controlPasses = /^\s*\[PASS\] counter matches the reconciled independent trace \(seed 555555\)$/m.test(controlOutput)
  && /^\s*\[PASS\] instant aggregate equals its category breakdown for every run$/m.test(controlOutput);
if (!controlPasses || MUTATIONS.some((mutation) => failedExpectedCheck(control, mutation.expect))) {
  console.log('  [BAD ] unmutated control: passing counter checks must not count as mutation failures');
  console.log(controlOutput);
  process.exit(1);
}
console.log('  [GOOD] unmutated control: both counter checks pass; unrelated failures are not mutation evidence');

let bad = 0;
const scratchDir = mkdtempSync(join('/tmp/kilo', 'wp-counter-'));
try {
  for (const mutation of MUTATIONS) {
    const original = readFileSync(join(root, 'tests', 'complete_run.py'), 'utf-8');
    const mutated = original.replace(mutation.find, mutation.replace);
    if (mutated === original) {
      console.log(`  [BAD ] ${mutation.name}: pattern not found (mutation never applied)`);
      bad++;
      continue;
    }
    const scratch = join(root, 'tests', '.complete_run_mutated.py');
    writeFileSync(scratch, mutated);
    try {
      const res = spawnSync(python, [scratch, '--trace-check'], {
        cwd: root,
        encoding: 'utf-8',
        timeout: 300000,
      });
      if (failedExpectedCheck(res, mutation.expect)) {
        console.log(`  [GOOD] ${mutation.name}: named equality check FAILED as required`);
      } else {
        console.log(`  [BAD ] ${mutation.name}: named failure not observed with assertion exit status 1 (status ${res.status})`);
        bad++;
      }
    } finally {
      rmSync(scratch, { force: true });
    }
  }
} finally {
  rmSync(scratchDir, { recursive: true, force: true });
}
process.exit(bad > 0 ? 1 : 0);
