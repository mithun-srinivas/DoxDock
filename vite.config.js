/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// DoxDock is a 100% client-side static app. No dev/prod proxy, no external hosts.
// The service worker precaches every asset so the app runs fully offline.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache everything the app needs, including the pdf.js worker and wasm.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        // Never fall back to the network for navigations — offline-first.
        navigateFallback: 'index.html',
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon-180.png'],
      manifest: {
        name: 'DoxDock — Local Document & Image Tools',
        short_name: 'DoxDock',
        description:
          'Offline-first document & image utilities. Nothing you upload ever leaves your machine.',
        theme_color: '#0b1018',
        background_color: '#0b1018',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2020',
    // Split the heavy libraries so the initial load stays small.
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          pdflib: ['pdf-lib'],
          docx: ['docx', 'mammoth'],
        },
      },
    },
  },
})
