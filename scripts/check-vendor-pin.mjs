/**
 * Vendor pin check (gate 5.3): verifies every file in vendor/gc/src/ is
 * byte-identical to the same path in `git archive <pin> src/` of the
 * framework repository, compared by SHA-256 across the whole tree with
 * equal file counts.
 *
 * Usage: node scripts/check-vendor-pin.mjs [--framework <dir>]
 * The framework checkout defaults to /opt/agents/repos/html5-game-ui-framework.
 * Exit 0 iff the tree matches the pin exactly.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const PIN = '952ae06e071a326e02f4ecb008256644fe2a5290';
const fwIdx = process.argv.indexOf('--framework');
const frameworkDir = fwIdx >= 0 ? resolve(process.argv[fwIdx + 1]) : '/opt/agents/repos/html5-game-ui-framework';
const vdIdx = process.argv.indexOf('--vendor');
const vendorDir = vdIdx >= 0 ? resolve(process.argv[vdIdx + 1]) : join(root, 'vendor', 'gc');

function listFiles(base, rel = '') {
  const out = [];
  for (const entry of readdirSync(join(base, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(base, r));
    else out.push(r);
  }
  return out.sort();
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// File list and hashes from the pinned commit itself.
const archiveList = execFileSync('git', ['-C', frameworkDir, 'archive', PIN, 'src/'], { maxBuffer: 64 * 1024 * 1024 });
// Comparison scope is the vendored src/ tree itself; WP's provenance README
// beside it is not framework content.
const entries = listFiles(join(vendorDir, 'src')).map((p) => `src/${p}`);

// Extract member hashes from the tar without writing to disk: tar member
// headers are parsed lightly; instead use git cat-file per path for exactness.
const pinHashes = new Map();
for (const path of entries) {
  const blob = execFileSync('git', ['-C', frameworkDir, 'cat-file', 'blob', `${PIN}:${path}`]);
  pinHashes.set(path, sha(blob));
}

const localHashes = new Map();
for (const path of entries) {
  localHashes.set(path, sha(readFileSync(join(vendorDir, path))));
}

// Equal file counts: the pin's src/ tree must have exactly the vendored set.
const pinTree = execFileSync('git', ['-C', frameworkDir, 'ls-tree', '-r', '--name-only', PIN, 'src/'])
  .toString()
  .split('\n')
  .filter((l) => l.trim().length > 0);

let failures = 0;
if (pinTree.length !== entries.length) {
  console.error(`FAIL file count: pin src/ has ${pinTree.length} files, vendor/gc has ${entries.length}`);
  failures++;
}
for (const path of pinTree) {
  if (!localHashes.has(path)) {
    console.error(`FAIL missing from vendor: ${path}`);
    failures++;
  }
}
for (const [path, localHash] of localHashes) {
  const pinHash = pinHashes.get(path);
  if (pinHash === undefined) {
    console.error(`FAIL not in pin: ${path}`);
    failures++;
  } else if (pinHash !== localHash) {
    console.error(`FAIL byte mismatch: ${path}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`vendor pin check FAILED (${failures} problem(s)) against pin ${PIN}`);
  process.exit(1);
}
console.log(`vendor pin check OK: ${entries.length} files byte-identical to ${frameworkDir}@${PIN}:src/`);
