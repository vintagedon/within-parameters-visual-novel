import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { runtimeDirtyFromPorcelain } from '../scripts/build-id.mjs';

const ROOT = resolve(import.meta.dirname, '..');

test('quoted runtime paths make a build dirty', () => {
  assert.equal(runtimeDirtyFromPorcelain('?? src/plain.ts\n'), true);
  assert.equal(runtimeDirtyFromPorcelain('?? "src/caf\\303\\251.ts"\n'), true);
  assert.equal(runtimeDirtyFromPorcelain('?? "public/quote\\\"name.png"\n'), true);
});

test('viewport scanner catches negative, uppercase, and range syntax', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wp-viewport-'));
  try {
    const css = join(dir, 'mutation.css');
    writeFileSync(css, '.a { margin-left: -2vw; }\n.b { width: 10VW; }\n@media (width >= 640px) { .c { display: block; } }\n');
    const result = spawnSync(process.execPath, ['scripts/scan-viewport-units.mjs', css], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /-2vw/i);
    assert.match(result.stderr, /10VW/);
    assert.match(result.stderr, /layout breakpoint/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('vendor pin reports an extra local file without a raw stack', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wp-vendor-'));
  try {
    const vendor = join(dir, 'gc');
    mkdirSync(vendor, { recursive: true });
    cpSync(join(ROOT, 'vendor', 'gc', 'src'), join(vendor, 'src'), { recursive: true });
    writeFileSync(join(vendor, 'src', 'extra.css'), '/* mutation */\n');
    const result = spawnSync(process.execPath, ['scripts/check-vendor-pin.mjs', '--vendor', vendor], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /FAIL not in pin: src\/extra\.css/);
    assert.doesNotMatch(result.stderr, /Error: Command failed|node:child_process/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
