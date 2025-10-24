import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: () => 'extension.js',
    },
    outDir: 'out',
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: ['vscode', /^node:.*/, '@gaql/core'],
      output: {
        entryFileNames: 'extension.js',
      },
    },
    target: 'node20',
    ssr: true,
  },
});
