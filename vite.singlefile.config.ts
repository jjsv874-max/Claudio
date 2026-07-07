import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build de arquivo único (tudo inline) para hospedagem estática / artifact.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'dist-single',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
