import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'

/**
 * Dev-server stand-in for nginx's /host-scripts/ location (see nginx.conf):
 * lists ./scripts as JSON autoindex and serves the files in it.
 */
function hostScripts(): Plugin {
  const dir = fileURLToPath(new URL('./scripts', import.meta.url))
  return {
    name: 'host-scripts',
    configureServer(server) {
      server.middlewares.use('/host-scripts', (req, res) => {
        const name = decodeURIComponent((req.url ?? '/').split('?')[0]!.slice(1))
        res.setHeader('Content-Type', 'application/json')
        if (name === '') {
          const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []
          res.end(JSON.stringify(files.map((f) => ({ name: f, type: 'file' }))))
          return
        }
        const file = join(dir, basename(name))   // basename: no escaping the folder
        if (!existsSync(file)) { res.statusCode = 404; res.end(); return }
        res.end(readFileSync(file))
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    hostScripts(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Character icons are fetched from remote hosts; keep every one seen for offline play
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://release.botc.app' ||
              url.href.startsWith('https://raw.githubusercontent.com/tomozbot/botc-icons/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'character-icons',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'BotC Storyteller',
        short_name: 'BotC ST',
        description: 'Blood on the Clocktower Storyteller Companion',
        theme_color: '#1e1b2e',
        background_color: '#0f0d1a',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
