import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project URL: https://braydencbell01-arch.github.io/Brayden-OS/
export default defineConfig({
  base: '/Brayden-OS/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'logo-mark.svg',
        'logo.svg',
        'pwa-192.png',
        'pwa-512.png',
      ],
      manifest: {
        name: 'Brayden Stats',
        short_name: 'Brayden Stats',
        description:
          'Soccer player ratings, live Big 5 scores, and league insights.',
        theme_color: '#06261c',
        background_color: '#06261c',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/Brayden-OS/',
        start_url: '/Brayden-OS/',
        lang: 'en',
        categories: ['sports', 'entertainment'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/Brayden-OS/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Live scores/stats should prefer the network.
            urlPattern: /^https:\/\/.*\.espn\.(com|com\.au)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'espn-api',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 5,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
