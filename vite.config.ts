import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {execSync} from 'child_process';
import path from 'path';
import {defineConfig, loadEnv, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

function resolveBuildId(): string {
  const isoDate = new Date().toISOString().slice(0, 10);
  const envRunNumber = process.env.GITHUB_RUN_NUMBER?.trim();
  const envSha = process.env.GITHUB_SHA?.trim().slice(0, 4);

  let suffix = '';
  try {
    const gitSha = execSync('git rev-parse --short=4 HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    if (gitSha) {
      suffix = gitSha;
    }
  } catch {
    // git may not be available in all build containers
  }

  if (!suffix && envSha) {
    suffix = envSha;
  }
  if (envRunNumber) {
    suffix = suffix ? `${suffix}-r${envRunNumber}` : `r${envRunNumber}`;
  }
  if (!suffix) {
    suffix = Math.floor(Date.now() / 1000)
      .toString(16)
      .slice(-4);
  }

  return `${isoDate}-${suffix}`;
}

function versionJsonPlugin(buildId: string, minBuild: string): Plugin {
  const payload = JSON.stringify(
    {
      version: '1.0',
      buildId,
      minBuild,
    },
    null,
    2
  );

  return {
    name: 'unstill-version-json',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url?.split('?')[0] || '';
        if (cleanUrl === '/version.json' || cleanUrl.endsWith('/version.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
          res.end(payload);
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: payload,
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const base = process.env.GITHUB_PAGES_BASE || env.GITHUB_PAGES_BASE || '/';
  const buildId = process.env.UNSTILL_BUILD_ID || env.UNSTILL_BUILD_ID || resolveBuildId();
  const minBuild = process.env.UNSTILL_MIN_BUILD || env.UNSTILL_MIN_BUILD || buildId;

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      versionJsonPlugin(buildId, minBuild),
      VitePWA({
        registerType: 'autoUpdate',
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
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          globIgnores: ['**/version.json'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/version\.json$/],
          runtimeCaching: [
            {
              urlPattern: ({url}) => url.pathname.endsWith('/version.json'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({request, url}) =>
                request.mode === 'navigate' ||
                url.pathname.endsWith('/index.html') ||
                url.pathname.endsWith('/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'unstill-html-cache',
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({request, url}) =>
                request.destination === 'script' ||
                request.destination === 'style' ||
                request.destination === 'font' ||
                /\.(?:js|css|woff2?)$/i.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'unstill-static-assets',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    define: {
      __BUILD_ID__: JSON.stringify(buildId),
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

