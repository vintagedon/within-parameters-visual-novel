import { defineConfig } from 'vite';
import { resolve, join } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

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
