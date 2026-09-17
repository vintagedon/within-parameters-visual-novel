/**
 * Mutation checks — prove the live-path checks discriminate.
 *
 * Copies src/ and data/ to a scratch directory, applies each mutation to the
 * scratch copy only, runs the live-path checks there, and asserts the checks
 * FAIL. A mutation that the checks survive means the checks do not guard the
 * behavior the mutation breaks.
 *
 * Mutations reproduce the pre-change defect behavior (gate 4.1: raw authored
 * deltas in selectChoice; gate 4.2: authored endingType overriding the
 * computed outcome).
 *
 * Usage: node scripts/run-mutation-checks.mjs
 */
import { build } from 'esbuild';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// ─── Mutations ────────────────────────────────────────────────────────────────

const MUTATIONS = [
  {
    name: '4.1 revert selectChoice to raw authored deltas (pre-change behavior)',
    file: 'src/engine/scene-runner.ts',
    find: /if \(category !== null\) \{[\s\S]*?\n    \} else if/,
    replace: `if (category !== null) {
      const sc = choice.statChanges ?? {};
      this.state = applyStatChanges(this.state, {
        knowledge: sc.knowledge ?? 0,
        consumables: sc.consumables ?? 0,
        clock: sc.clock ?? 0,
      });
    } else if`,
  },
  {
    name: '4.2 authored ending routing overrides the computed outcome (pre-change behavior)',
    file: 'src/engine/scene-runner.ts',
    find: /const endingSceneId = `scene-ending-\$\{outcome\.ending\}`;/,
    replace: `const endingSceneId = 'scene-ending-correction'; // mutation: authored routing wins`,
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runChecksIn(scratchRoot) {
  const outfile = join(scratchRoot, 'live-checks.mjs');
  const result = await build({
    entryPoints: [join(scratchRoot, 'src/engine/live-checks.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    outfile,
    write: false,
    logLevel: 'silent',
  });
  writeFileSync(outfile, result.outputFiles[0].text);
  const res = spawnSync('node', [outfile], { cwd: scratchRoot, encoding: 'utf-8' });
  return { status: res.status ?? 0, output: (res.stdout ?? '') + (res.stderr ?? '') };
}

let bad = 0;
for (const mutation of MUTATIONS) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'wp-mutation-'));
  try {
    cpSync(join(root, 'src'), join(tmpDir, 'src'), { recursive: true });
    cpSync(join(root, 'data'), join(tmpDir, 'data'), { recursive: true });
    cpSync(join(root, 'vendor'), join(tmpDir, 'vendor'), { recursive: true });

    const target = join(tmpDir, mutation.file);
    const original = readFileSync(target, 'utf-8');
    const mutated = original.replace(mutation.find, mutation.replace);
    if (mutated === original) {
      console.log(`  [BAD ] ${mutation.name}: pattern not found (mutation never applied)`);
      bad++;
      continue;
    }
    writeFileSync(target, mutated);

    const { status, output } = await runChecksIn(tmpDir);
    const failedLines = (output.match(/\[FAIL\]/g) ?? []).length;
    if (status !== 0 && failedLines > 0) {
      console.log(`  [GOOD] ${mutation.name}: checks failed (${failedLines} failing check(s)) as required`);
    } else {
      console.log(`  [BAD ] ${mutation.name}: checks PASSED against the mutated code (do not discriminate)`);
      bad++;
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

process.exit(bad > 0 ? 1 : 0);
