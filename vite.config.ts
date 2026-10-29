import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const base = process.env.GITHUB_PAGES_BASE || env.GITHUB_PAGES_BASE || '/';
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        scope: base,
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: base,
          name: 'UnStill — Everyday Movement',
          short_name: 'UnStill',
          description: 'Everyday movement that fits real life.',
          theme_color: '#2EB8F5',
          background_color: '#F4FAFF',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
        },
      }),
    ],
    define: {
      'import.meta.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(
        env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-96c50de0-eede-46b1-be7a-cef795c37e9e'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
