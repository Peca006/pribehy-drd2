// Napojení vzhledu na okno: načte nainstalované Háv, použije zvolený a přepočítá ho při změně viewportu
// (otočení telefonu, změna velikosti okna) nebo systémového schématu. Zbytek logiky je v `active.ts`.
import { settings } from '../settings.svelte'
import { applyTheme } from '../theme'
import { effectiveViewport, pickTheme, type SystemScheme } from './active'
import { classifyViewport, type Skin, type Viewport } from './skin'
import { listSkins } from './store'

let installed: Skin[] = []
let lastViewport: Viewport | null = null
let started = false

const sameViewport = (a: Viewport | null, b: Viewport) =>
  !!a && a.width === b.width && a.orientation === b.orientation && a.low === b.low

const systemScheme = (): SystemScheme =>
  matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'

function isTyping(): boolean {
  const el = document.activeElement
  return !!el && (el.matches('input, textarea, select') || (el as HTMLElement).isContentEditable)
}

function apply(force = false) {
  const viewport = effectiveViewport(
    classifyViewport(window.innerWidth, window.innerHeight),
    lastViewport,
    isTyping(),
  )
  if (!force && sameViewport(lastViewport, viewport)) return
  lastViewport = viewport
  applyTheme(pickTheme(settings.skin, installed, systemScheme(), viewport))
}

/** Znovu načte nainstalované Háv z úložiště a použije zvolený (po instalaci, smazání nebo změně volby). */
export async function refreshInstalledSkins(): Promise<void> {
  installed = (await listSkins()).map((s) => s.skin)
  apply(true)
}

/** Použije aktuální volbu z nastavení (po `setSkin`). */
export const reapplyTheme = () => apply(true)

export async function startSkinRuntime(): Promise<void> {
  if (started) return
  started = true
  apply(true) // hned, ať se nemigotá výchozí vzhled; Háv se doplní po načtení úložiště
  // `orientationchange` (a někdy i `resize`) přijde dřív, než se přepočítají rozměry okna: po krátké prodlevě
  // se proto zkontrolují znovu, jinak by vzhled zůstal podle starých rozměrů
  let recheck: ReturnType<typeof setTimeout> | undefined
  const onResize = () => {
    apply()
    clearTimeout(recheck)
    recheck = setTimeout(() => apply(), 250)
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  document.addEventListener('focusout', onResize)
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => apply(true))
  await refreshInstalledSkins().catch((e) => console.error('Háv se nepodařilo načíst', e))
}
