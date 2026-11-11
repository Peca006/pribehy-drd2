import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Družina – Dračí doupě 2',
        short_name: 'Družina',
        description: 'Deník postav, družiny a žurnál dobrodružství pro Dračí doupě 2',
        lang: 'cs',
        display: 'standalone',
        start_url: './',
        background_color: '#1c1a17',
        theme_color: '#1c1a17',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts', 'tools/**/*.test.ts'] },
})
