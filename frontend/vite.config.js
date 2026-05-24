import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'vendor-three';
          if (id.includes('/node_modules/maplibre-gl/')) return 'vendor-maplibre';
          if (
            id.includes('/node_modules/@deck.gl/')
            || id.includes('/node_modules/@luma.gl/')
            || id.includes('/node_modules/@loaders.gl/')
          ) return 'vendor-deck';
          if (id.includes('/node_modules/@vue/') || id.includes('/node_modules/vue/')) return 'vendor-vue';
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
