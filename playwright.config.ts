import { defineConfig } from '@playwright/test'

// E2E zkoušky hlavní cesty (npm run e2e). Prohlížeč: ve výchozím stavu Chromium z Playwrightu
// (`npx playwright install chromium`, v CI se dělá samo); lokálně lze použít nainstalovaný prohlížeč bez stahování:
//   PW_CHANNEL=msedge npm run e2e      (nebo chrome)
const PORT = 5199
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL || undefined,
    locale: 'cs-CZ',
    trace: 'retain-on-failure',
    // Service Worker by v testu jen překážel (jiná verze cache); aplikace funguje i bez něj
    serviceWorkers: 'block',
  },
  webServer: {
    // `dev` sestaví před spuštěním balíčky ze SRD do public/packs (predev) a servíruje je na /packs/
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
