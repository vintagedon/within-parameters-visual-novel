/**
 * Counter mutations (A1.5) — prove the dialogue counter discriminates.
 *
 * Copies tests/complete_run.py to a temporary mutated variant inside tests/,
 * runs it with --trace-check (one natural seed-555555 run against the
 * production build), and asserts the counter's equality assertion against
 * the independent reference trace FAILS under each mutation:
 *   1. drop ordinary dialogue counting (the .typing observer never arms);
 *   2. drop epilogue counting (the ending epilogue is never added).
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
  },
  {
    name: 'A1.5 drops epilogue counting at the ending',
    find: 'result.instant_breakdown["epilogue"] = len(epilogue)',
    replace: 'pass',
  },
];

const python = '/opt/agents/venv/bin/python';
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
      const output = (res.stdout ?? '') + (res.stderr ?? '');
      const failedEquality = /\[FAIL\] counter matches the reconciled independent trace/.test(output);
      if (res.status !== 0 && failedEquality) {
        console.log(`  [GOOD] ${mutation.name}: trace equality check FAILED as required`);
      } else {
        console.log(`  [BAD ] ${mutation.name}: trace check PASSED against the mutated counter (status ${res.status})`);
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
