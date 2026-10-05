import { defineConfig } from 'vite';
import { resolve, join } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { runtimeDirtyFromPorcelain } from './scripts/build-id.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Build identifier (gate 5.7): the full SHA of HEAD plus a dirty flag that
 * detects staged and unstaged tracked changes. A build that consumes
 * untracked runtime source, styles, or assets refuses to label itself clean;
 * ignored paths (evidence, build output, recycle-bin) are not runtime inputs
 * and do not make the build dirty.
 */
function buildInfo(): { sha: string; dirty: boolean } {
  try {
    const sha = execSync('git rev-parse HEAD', { cwd: __dirname }).toString().trim();
    const porcelain = execSync('git status --porcelain', { cwd: __dirname }).toString();
    return { sha, dirty: runtimeDirtyFromPorcelain(porcelain) };
  } catch {
    // No git context (scratch copies): never label such a build clean.
    return { sha: 'unknown', dirty: true };
  }
}

const wpBuild = buildInfo();

function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  define: {
    __WP_BUILD__: JSON.stringify(wpBuild),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@data': resolve(__dirname, 'data'),
    },
  },
  plugins: [
    {
      name: 'serve-data-dir',
      configureServer(server) {
        server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url ?? '';
          if (url.startsWith('/data/')) {
            const filePath = resolve(__dirname, url.slice(1));
            try {
              const content = readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(content);
            } catch {
              next();
            }
          } else {
            next();
          }
        });
      },
      closeBundle() {
        copyDir(resolve(__dirname, 'data'), resolve(__dirname, 'dist', 'data'));
        // Ship every runtime-requested asset subtree. Vite's hashed bundle
        // output lives in dist/assets/ under hashed filenames and does not
        // collide with these fixed game subtrees.
        for (const subtree of ['backgrounds', 'portraits', 'audio']) {
          copyDir(
            resolve(__dirname, 'assets', subtree),
            resolve(__dirname, 'dist', 'assets', subtree)
          );
        }
      },
    },
  ],
});
