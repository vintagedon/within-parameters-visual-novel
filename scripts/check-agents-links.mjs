/**
 * AGENTS.md Key Documents link check (gate 5.11): every repo-relative or
 * absolute path named in the Key Documents table (and the Locked engine-spec
 * pointer) must resolve on disk. Run: node scripts/check-agents-links.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'AGENTS.md'), 'utf8');

const keyDocs = src.slice(src.indexOf('## Key Documents'));
const paths = new Set();

// Table rows: the second column is a path in backticks.
for (const line of keyDocs.split('\n')) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim());
  const candidate = cells[2];
  if (candidate && candidate.startsWith('`') && candidate.endsWith('`') && !candidate.includes(' ')) {
    paths.add(candidate.slice(1, -1));
  }
}

// Markdown links anywhere in the file that point at local files.
const linkRe = /\]\(([^)#]+)\)/g;
let m;
while ((m = linkRe.exec(src))) {
  const target = m[1];
  if (target.startsWith('http')) continue;
  paths.add(target);
}

let bad = 0;
for (const p of paths) {
  const abs = p.startsWith('/') ? p : join(root, p);
  if (!existsSync(abs)) {
    console.error(`MISSING: ${p}`);
    bad++;
  }
}
if (bad > 0) {
  console.error(`AGENTS.md link check FAILED (${bad})`);
  process.exit(1);
}
console.log(`AGENTS.md link check OK: ${paths.size} paths resolve`);
