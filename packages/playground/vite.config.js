import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    // Exclude workspace package from pre-bundling so changes are picked up immediately
    exclude: ['@ahsankhanamu/json-transformer'],
  },
  server: {
    fs: { allow: ['..'] },
  },
});
