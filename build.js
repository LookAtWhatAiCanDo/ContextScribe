import { build } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

async function run() {
  console.log('[ContextScribe Build] Building popup, options, and background scripts...');
  // Build 1: Extension pages & background service worker (can use ES modules)
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/popup.html'),
          options: resolve(__dirname, 'src/options/options.html'),
          background: resolve(__dirname, 'src/background/index.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background') {
              return '[name].js';
            }
            return '[name]/[name].js';
          },
          assetFileNames: 'assets/[name].[ext]',
          chunkFileNames: 'chunks/[name].js',
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      }
    }
  });

  console.log('[ContextScribe Build] Building content script (IIFE format)...');
  // Build 2: Content script (must be IIFE, self-contained, no imports)
  await build({
    configFile: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false, // Preserve Build 1 files
      minify: false,
      sourcemap: true,
      lib: {
        entry: resolve(__dirname, 'src/content/index.ts'),
        name: 'ContentScript',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'assets/content.css';
            }
            return 'assets/[name].[ext]';
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      }
    }
  });
  console.log('[ContextScribe Build] Build complete!');
}

run().catch((err) => {
  console.error('[ContextScribe Build] Build failed:', err);
  process.exit(1);
});
