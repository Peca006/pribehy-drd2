import { expect, test } from '@playwright/test'

// Výpravy, etapa 1: dobrodružství a výprava se vytvoří, upraví, přenese mezi nimi a přežijí obnovení stránky.

test('dobrodružství a výprava: vytvoření, úprava, zařazení a smazání', async ({ page }) => {
  // pruh o stažení balíčků by zakrýval tlačítka na konci stránky
  await page.addInitScript(() => localStorage.setItem('drd2.packPromptDismissed', '1'))
  await page.goto('/#/vypravy')
  await expect(page.getByRole('heading', { name: 'Výpravy', level: 1 })).toBeVisible()
  // vysoké okno: spodní pruh o stažení balíčků a navigace by jinak zakrývaly tlačítka na konci stránky
  await page.setViewportSize({ width: 1280, height: 2000 })

  // dobrodružství
  await page.getByLabel('Název nového dobrodružství').fill('Bílý hrad')
  await page.getByRole('button', { name: 'Nové dobrodružství' }).click()
  await expect(page.getByRole('heading', { name: 'Dobrodružství', level: 1 })).toBeVisible()
  await page.getByLabel('Téma').fill('Lapkové a obři')
  await page.getByLabel('Poznámky k propojení výprav').click() // opuštění pole uloží

  // nová výprava přímo v dobrodružství
  await page.getByLabel('Název nové výpravy').fill('Cesta k hradu')
  await page.getByRole('button', { name: 'Nová výprava', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Příprava výpravy' })).toBeVisible()
  await expect(page.getByLabel('Dobrodružství')).toHaveValue(/.+/)

  await page.getByLabel('Zápletka pro postavy').fill('Stabor hledá družinu')
  await page.getByLabel('Cíl výpravy').fill('Dojít k Bílému hradu')
  await page.getByRole('radio', { name: /Dílky puzzle/ }).check()
  await page.getByLabel('Poznámky', { exact: true }).click() // uložení

  // po obnovení stránky je vše zachované
  await page.reload()
  await expect(page.getByLabel('Zápletka pro postavy')).toHaveValue('Stabor hledá družinu')
  await expect(page.getByRole('radio', { name: /Dílky puzzle/ })).toBeChecked()

  // vyřazení z dobrodružství: výprava se objeví mezi samostatnými
  await page.getByLabel('Dobrodružství').selectOption('')
  await page.getByLabel('Poznámky', { exact: true }).click()
  await page.goto('/#/vypravy')
  await expect(page.getByRole('link', { name: /Cesta k hradu/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Bílý hrad/ })).toContainText('výprav: 0')

  // smazání výpravy s potvrzením
  await page.getByRole('link', { name: /Cesta k hradu/ }).click()
  await page.getByRole('button', { name: 'Smazat výpravu' }).click()
  await page.getByRole('button', { name: 'Smazat', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: 'Výpravy', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cesta k hradu/ })).toHaveCount(0)
})
