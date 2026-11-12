import { defineConfig } from 'vite'

// Bookmarklet „Převést SRD“: jediný skript (IIFE) z tools/srd/browser/entry.mjs do public/srd-import.js,
// odkud se nasadí s aplikací. Obsahuje jen kód převodníku, žádné texty SRD.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: false,
    lib: {
      entry: 'tools/srd/browser/entry.mjs',
      formats: ['iife'],
      name: 'drd2SrdImport',
      fileName: () => 'srd-import.js',
    },
    minify: true,
  },
})
