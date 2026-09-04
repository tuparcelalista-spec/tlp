import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5175,
    open: true,
    fs: {
      strict: false
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
