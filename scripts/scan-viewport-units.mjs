/**
 * Viewport-unit and breakpoint scan (gates 5.4/5.5).
 *
 * Inspects ACTIVE declarations and style-setting code for raw viewport units
 * (vw, vh, vmin, vmax and their small/large/dynamic variants) and for
 * width-, height-, or orientation-based media queries. Comments, and prose
 * inside comment blocks, are ignored; string matches inside active template
 * literals and CSS declarations count.
 *
 * Usage: node scripts/scan-viewport-units.mjs <file-or-dir> [...more]
 * Exit 1 when an active violation is found outside the allowlisted host
 * files (--allow <file> marks a file whose viewport units are permitted,
 * e.g. the outer stage host module).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const args = process.argv.slice(2);
const allowIdx = args.indexOf('--allow');
const allowFiles = new Set();
for (let i = allowIdx; i >= 0 && i < args.length - 1 && args[i] === '--allow'; i += 2) {
  allowFiles.add(resolve(args[i + 1]));
}
const targets = args.filter((a, i) => a !== '--allow' && args[i - 1] !== '--allow');

const UNIT = /(?<![\w-])[+-]?(?:\d+\.?\d*|\.\d+)(?:vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|dvi|dvb|vi|vb)\b/i;
const BREAKPOINT = /@media[^{]*(?:\b(?:min-width|max-width|min-height|max-height|orientation|device-width|device-height|aspect-ratio)\s*[: (]|\b(?:width|height|device-width|device-height|aspect-ratio)\s*(?:[<>]=?|=))/i;

function stripComments(src) {
  // Block comments (CSS, JS) and line comments (JS). Keeps string contents;
  // a commented-out rule is not an active declaration.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function* walk(p) {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) yield* walk(join(p, e));
  } else {
    yield p;
  }
}

let violations = 0;
const files = targets.flatMap((t) => [...walk(resolve(t))]);
for (const file of files) {
  const ext = extname(file);
  if (!['.css', '.ts', '.js', '.mjs', '.html'].includes(ext)) continue;
  const allowed = [...allowFiles].some((a) => resolve(file) === a);
  const src = stripComments(readFileSync(file, 'utf8'));
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const m = line.match(UNIT);
    if (m && !allowed) {
      console.error(`VIOLATION viewport unit '${m[0]}' at ${file}:${i + 1}: ${line.trim()}`);
      violations++;
    }
    const b = line.match(BREAKPOINT);
    if (b) {
      console.error(`VIOLATION layout breakpoint at ${file}:${i + 1}: ${line.trim()}`);
      violations++;
    }
  });
}

if (violations > 0) {
  console.error(`viewport-unit/breakpoint scan FAILED (${violations} active violation(s))`);
  process.exit(1);
}
console.log(`viewport-unit/breakpoint scan OK: ${files.length} files, no active violations`);
