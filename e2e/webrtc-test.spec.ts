import { expect, test } from '@playwright/test'

// Dílna → Test WebRTC (průzkum, PLAN-WEBRTC.md etapa 0): dvě okna jednoho prohlížeče se propojí vloženým textem
// přes smyčku (ověřuje postup a protokol, ne síť), zbytek je zápis poznámek ze zkoušek.

test('Test WebRTC: spojení dvou oken textem, ping a zpráva; poznámky přežijí obnovení', async ({ browser, baseURL }) => {
  const open = async () => {
    const ctx = await browser.newContext({ baseURL })
    const page = await ctx.newPage()
    await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))
    await page.goto('/#/knihovna/dilna')
    await page.locator('summary', { hasText: 'Test WebRTC' }).click()
    return { ctx, page }
  }
  const a = await open()
  const b = await open()

  await a.page.getByRole('button', { name: 'A: Vytvořit nabídku' }).click()
  const offer = await a.page.getByLabel('Kód nabídky').inputValue()
  expect(offer.startsWith('DRD2:')).toBe(true)

  await b.page.getByRole('button', { name: 'B: Připojit se' }).click()
  await b.page.getByLabel('Kód od druhého zařízení').fill(offer)
  await b.page.getByRole('button', { name: 'Vytvořit odpověď' }).click()
  const answer = await b.page.getByLabel('Kód odpovědi').inputValue()

  await a.page.getByLabel('Kód od druhého zařízení').fill(answer)
  await a.page.getByRole('button', { name: 'Spojit' }).click()
  await expect(a.page.locator('.status')).toContainText('otevřený', { timeout: 20000 })
  await expect(b.page.locator('.status')).toContainText('otevřený', { timeout: 20000 })
  await expect(a.page.locator('.status')).toContainText(/\d+ ms/, { timeout: 10000 })

  await a.page.getByLabel('Zpráva', { exact: true }).fill('ahoj')
  await a.page.getByRole('button', { name: 'Poslat', exact: true }).click()
  await expect(b.page.locator('.log')).toContainText('přijato: ahoj')

  // poznámky ze zkoušek: zapsat a po obnovení najít
  const row = a.page.locator('.scenario', { hasText: 'Hotspot z Androidu' })
  await row.getByRole('checkbox').check()
  await row.getByLabel('OK').check()
  await row.getByLabel(/^Poznámka:/).fill('Pixel + Galaxy')
  await row.getByLabel(/^Poznámka:/).blur()
  await a.page.reload()
  await a.page.locator('summary', { hasText: 'Test WebRTC' }).click()
  const again = a.page.locator('.scenario', { hasText: 'Hotspot z Androidu' })
  await expect(again.getByRole('checkbox')).toBeChecked()
  await expect(again.getByLabel('OK')).toBeChecked()
  await expect(again.getByLabel(/^Poznámka:/)).toHaveValue('Pixel + Galaxy')

  await a.ctx.close()
  await b.ctx.close()
})
