import { readFileSync } from 'node:fs'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    svelte(),
    VitePWA({
      workbox: { importScripts: ['share-target.js'], globIgnores: ['**/srd-import.js'] },
      // nová verze se stáhne na pozadí a uživateli se nabídne „Obnovit“ (registraci řeší src/core/pwa.svelte.ts)
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Příběhy v Dračím doupěti',
        short_name: 'Příběhy',
        description: 'Tvorba a deník postav, bestiář a pravidla pro Dračí doupě 2 – offline',
        lang: 'cs',
        display: 'standalone',
        start_url: './',
        background_color: '#1c1a17',
        theme_color: '#1c1a17',
        // cíl sdílení: kód postavy či družiny poslaný z jiné aplikace (zprávy, Quick Share…) se otevře v Importu
        share_target: {
          action: './share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: { title: 'title', text: 'text', files: [{ name: 'file', accept: ['text/plain', '.txt'] }] },
        },
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts', 'tools/**/*.test.ts'] },
})
