/**
 * Verifies a fresh production build ships every asset path the runtime
 * requests: resolves each manifest entry in data/characters.json against
 * dist/ and fails on any required file (source present) that is absent from
 * the build. Source files missing from assets/ are enumerated as findings
 * rather than failures (gate 4.8 owns their disposition).
 *
 * Usage: node scripts/check-dist-assets.mjs
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, 'data/characters.json'), 'utf-8'));
const distAssets = resolve(root, 'dist', 'assets');

const required = [];
const findings = [];
let absent = 0;

for (const entry of [...manifest.portraits, ...manifest.backgrounds, ...manifest.audio]) {
  const srcPath = resolve(root, 'assets', entry.path);
  const builtPath = join(distAssets, entry.path);
  const sourceExists = existsSync(srcPath);
  const builtExists = existsSync(builtPath);

  if (!sourceExists) {
    findings.push(`${entry.key}: no source file at assets/${entry.path}`);
    continue;
  }
  required.push(entry.key);
  if (!builtExists) {
    console.error(`  ABSENT ${entry.key}: ${entry.path} missing from dist/assets`);
    absent++;
  }
}

console.log('Dist asset check (data/characters.json manifest vs dist/assets)');
console.log(`  required (source present): ${required.length}`);
console.log(`  absent from build:         ${absent}`);
if (findings.length > 0) {
  console.log(`  findings (no source; enumerated for gate 4.8):`);
  for (const f of findings) console.log(`    - ${f}`);
}

if (absent > 0) {
  process.exit(1);
}
console.log('  zero absent required files');
