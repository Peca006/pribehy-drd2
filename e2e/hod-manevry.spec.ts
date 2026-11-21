import { expect, test } from '@playwright/test'

// Panel Hod: manévr Přesně a postih Nepřesně se vylučují, hod třemi kostkami platí manévr Zdrojem.

test('manévr Přesně a postih Nepřesně se vylučují', async ({ page }) => {
  await page.goto('/#/knihovna')
  await page.getByRole('button', { name: 'Skrýt' }).click()
  await page.getByText('Ukázková data', { exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).click()
  await page.getByRole('button', { name: 'Obnovit', exact: true }).last().click()
  await expect(page.getByText('Ukázková data jsou obnovená')).toBeVisible()
  await page.goto('/#/postavy')
  await page.getByRole('link', { name: /Brokan Rudovous/ }).click()

  const roll = page.locator('#roll-panel')
  const presne = roll.getByRole('group', { name: 'Manévr' }).getByRole('button', { name: 'Přesně', exact: true })
  const postih = roll.getByRole('button', { name: 'Nepřesně (postih)' })

  await presne.click()
  await expect(roll.getByText(/3 kostky, počítají se dvě nejvyšší/)).toBeVisible()

  // postih vypne Přesně a Přesně pak nejde zvolit
  await postih.click()
  await expect(roll.getByText('Postih: 3 kostky')).toBeVisible()
  await expect(presne).toBeDisabled()

  // zrušení postihu Přesně zase povolí
  await postih.click()
  await expect(presne).toBeEnabled()

  // Přesně: hod třemi kostkami zaplatí manévr
  await presne.click()
  await roll.locator('button.roll').click()
  await expect(roll.getByText(/Manévr zaplacen/)).toBeVisible()
})
